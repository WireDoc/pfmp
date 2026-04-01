using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Anthropic Claude Sonnet 4 service - Conservative AI financial advisor.
/// Focuses on safety, risk mitigation, and prudent financial strategies.
/// Uses the latest Claude Sonnet 4 model (May 2025) for enhanced reasoning.
/// </summary>
public class ClaudeService : IAIFinancialAdvisor
{
    private readonly HttpClient _httpClient;
    private readonly ClaudeServiceOptions _options;
    private readonly ILogger<ClaudeService> _logger;

    public string ServiceName => "Claude";
    public string ModelVersion => _options.Model;

    public ClaudeService(
        HttpClient httpClient,
        IOptions<ClaudeServiceOptions> options,
        ILogger<ClaudeService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        // Configure HttpClient
        _httpClient.BaseAddress = new Uri(_options.ApiUrl);
        _httpClient.DefaultRequestHeaders.Add("x-api-key", _options.ApiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
    }

    public async Task<AIRecommendation> GetRecommendationAsync(AIPromptRequest request)
    {
        _logger.LogInformation(
            "Claude API call: model={Model}, promptLength={Length}, caching={Caching}, temperature={Temp}",
            _options.Model, request.UserPrompt.Length, _options.EnablePromptCaching && !string.IsNullOrEmpty(request.CacheableContext), request.Temperature);

        // Build system message with optional caching
        var systemMessages = new List<object>();
        
        if (_options.EnablePromptCaching && !string.IsNullOrEmpty(request.CacheableContext))
        {
            // Log the cacheable context size for debugging
            var estimatedTokens = request.CacheableContext.Length / 4; // Rough estimate: 1 token ≈ 4 chars
            _logger.LogInformation(
                "Prompt caching enabled: context length={Length} chars, estimated tokens={Tokens}. Minimum 1024 tokens required for caching.",
                request.CacheableContext.Length, estimatedTokens);
            
            // Add cacheable context with cache_control breakpoint
            systemMessages.Add(new
            {
                type = "text",
                text = request.CacheableContext,
                cache_control = new { type = "ephemeral" }
            });
        }
        
        // Add non-cacheable system prompt
        systemMessages.Add(new
        {
            type = "text",
            text = request.SystemPrompt
        });

        var anthropicRequest = new
        {
            model = _options.Model,
            max_tokens = request.MaxTokens > 0 ? request.MaxTokens : _options.MaxTokens,
            temperature = (double)request.Temperature,
            system = systemMessages.ToArray(),
            messages = new[]
            {
                new { role = "user", content = request.UserPrompt }
            }
        };

        AIRecommendation? recommendation = null;
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _options.MaxRetries; attempt++)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("", anthropicRequest);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    recommendation = ParseClaudeResponse(responseContent, request.UserId);
                    
                    _logger.LogInformation(
                        "Claude success: recommendationId={Id}, tokens={Tokens}, cost=${Cost:F4}, confidence={Confidence:P0}",
                        recommendation.RecommendationId, recommendation.TokensUsed, recommendation.EstimatedCost, recommendation.ConfidenceScore);
                    
                    return recommendation;
                }

                _logger.LogWarning(
                    "Claude API error (attempt {Attempt}/{Max}): {StatusCode} - {Reason}",
                    attempt, _options.MaxRetries, response.StatusCode, response.ReasonPhrase);

                lastException = new HttpRequestException($"Claude API returned {response.StatusCode}");

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // Exponential backoff
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Claude API exception (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
        }

        throw new InvalidOperationException($"Claude API failed after {_options.MaxRetries} attempts", lastException);
    }

    public async Task<AIRecommendation> GetRetirementAdviceAsync(string userId)
    {
        // TODO: Load user profile and construct retirement-specific prompt
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a conservative financial advisor focused on retirement planning safety and risk management.",
            UserPrompt = "Analyze my retirement readiness and provide prudent recommendations.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetRebalancingAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a conservative financial advisor focused on portfolio safety and risk-adjusted returns.",
            UserPrompt = "Analyze my portfolio allocation and suggest conservative rebalancing strategies.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetCashOptimizationAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a conservative financial advisor focused on safe cash management and liquidity.",
            UserPrompt = "Analyze my cash holdings and suggest safe optimization strategies.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    private AIRecommendation ParseClaudeResponse(string responseContent, string userId)
    {
        using var doc = JsonDocument.Parse(responseContent);
        var root = doc.RootElement;

        // Extract content from Claude response
        var content = root.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
        
        // Extract token usage
        var usage = root.GetProperty("usage");
        var inputTokens = usage.GetProperty("input_tokens").GetInt32();
        var outputTokens = usage.GetProperty("output_tokens").GetInt32();
        
        // Extract cache usage if available (Prompt Caching feature)
        var cacheCreationTokens = 0;
        var cacheReadTokens = 0;
        
        if (usage.TryGetProperty("cache_creation_input_tokens", out var cacheCreation))
        {
            cacheCreationTokens = cacheCreation.GetInt32();
        }
        
        if (usage.TryGetProperty("cache_read_input_tokens", out var cacheRead))
        {
            cacheReadTokens = cacheRead.GetInt32();
        }
        
        var totalTokens = inputTokens + outputTokens;

        // Calculate cost with cache pricing
        var estimatedCost = 0m;
        if (_options.EnableCostTracking)
        {
            // Regular input tokens (non-cached)
            var regularInputTokens = inputTokens - cacheCreationTokens - cacheReadTokens;
            var inputCost = regularInputTokens / 1_000_000m * _options.InputCostPerMTok;
            
            // Cache write cost (25% premium)
            var cacheWriteCost = cacheCreationTokens / 1_000_000m * _options.CacheWriteCostPerMTok;
            
            // Cache read cost (90% discount)
            var cacheReadCost = cacheReadTokens / 1_000_000m * _options.CacheReadCostPerMTok;
            
            // Output cost
            var outputCost = outputTokens / 1_000_000m * _options.OutputCostPerMTok;
            
            estimatedCost = inputCost + cacheWriteCost + cacheReadCost + outputCost;
            
            if (cacheReadTokens > 0 || cacheCreationTokens > 0)
            {
                _logger.LogInformation(
                    "Cache stats: created={Created}, read={Read}, saved=${Saved:F4}",
                    cacheCreationTokens, cacheReadTokens, 
                    (cacheReadTokens / 1_000_000m * (_options.InputCostPerMTok - _options.CacheReadCostPerMTok)));
            }
        }

        // Parse recommendation text (basic extraction, will enhance with structured output)
        var recommendation = new AIRecommendation
        {
            ServiceName = ServiceName,
            ModelVersion = ModelVersion,
            RecommendationText = content,
            Reasoning = ExtractReasoning(content),
            ActionItems = ExtractActionItems(content),
            ConfidenceScore = EstimateConfidence(content),
            TokensUsed = totalTokens,
            EstimatedCost = estimatedCost,
            Metadata = new Dictionary<string, object>
            {
                ["userId"] = userId,
                ["inputTokens"] = inputTokens,
                ["outputTokens"] = outputTokens,
                ["stopReason"] = root.GetProperty("stop_reason").GetString() ?? "end_turn",
                ["cacheCreationTokens"] = cacheCreationTokens,
                ["cacheReadTokens"] = cacheReadTokens,
                ["cacheHit"] = cacheReadTokens > 0
            }
        };

        return recommendation;
    }

    private string ExtractReasoning(string content)
    {
        // TODO: Enhance with structured prompt to get reasoning section
        // For now, return first paragraph
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lines.Length > 0 ? lines[0] : content;
    }

    private List<string> ExtractActionItems(string content)
    {
        // TODO: Enhance with structured prompt to get action items
        // For now, extract numbered or bullet points
        var actionItems = new List<string>();
        var lines = content.Split('\n');

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("- ") || 
                trimmed.StartsWith("• ") || 
                char.IsDigit(trimmed.FirstOrDefault()))
            {
                actionItems.Add(trimmed.TrimStart('-', '•', ' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'));
            }
        }

        return actionItems;
    }

    private decimal EstimateConfidence(string content)
    {
        // TODO: Enhance with explicit confidence scoring in prompt
        // For now, use heuristics based on language
        var lowerContent = content.ToLower();
        
        if (lowerContent.Contains("certainly") || lowerContent.Contains("definitely"))
            return 0.9m;
        if (lowerContent.Contains("likely") || lowerContent.Contains("should"))
            return 0.8m;
        if (lowerContent.Contains("might") || lowerContent.Contains("could"))
            return 0.7m;
        if (lowerContent.Contains("possibly") || lowerContent.Contains("maybe"))
            return 0.6m;

        return 0.75m; // Default moderate confidence
    }
}
