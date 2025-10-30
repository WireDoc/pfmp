using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// OpenAI GPT-5 service - Primary AI financial advisor.
/// Provides comprehensive financial analysis with advanced reasoning capabilities.
/// Uses GPT-5 (or latest available GPT-4 variant) as the primary recommendation engine.
/// </summary>
public class OpenAIService : IAIFinancialAdvisor
{
    private readonly HttpClient _httpClient;
    private readonly OpenAIServiceOptions _options;
    private readonly ILogger<OpenAIService> _logger;

    public string ServiceName => "OpenAI";
    public string ModelVersion => _options.Model;

    public OpenAIService(
        HttpClient httpClient,
        IOptions<OpenAIServiceOptions> options,
        ILogger<OpenAIService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        // Configure HttpClient
        _httpClient.BaseAddress = new Uri(_options.Endpoint);
        _httpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
    }

    public async Task<AIRecommendation> GetRecommendationAsync(AIPromptRequest request)
    {
        _logger.LogInformation(
            "OpenAI API call: model={Model}, promptLength={Length}, temperature={Temp}",
            _options.Model, request.UserPrompt.Length, request.Temperature);

        // Build messages array
        var messages = new List<object>();
        
        // Add cacheable context as a system message if provided
        if (!string.IsNullOrEmpty(request.CacheableContext))
        {
            messages.Add(new
            {
                role = "system",
                content = request.CacheableContext
            });
        }
        
        // Add system prompt
        messages.Add(new
        {
            role = "system",
            content = request.SystemPrompt
        });

        // Add user prompt
        messages.Add(new
        {
            role = "user",
            content = request.UserPrompt
        });

        var openAIRequest = new
        {
            model = _options.Model,
            messages = messages.ToArray(),
            max_tokens = request.MaxTokens > 0 ? request.MaxTokens : _options.MaxTokens,
            temperature = (double)request.Temperature
        };

        AIRecommendation? recommendation = null;
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _options.MaxRetries; attempt++)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("chat/completions", openAIRequest);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    recommendation = ParseOpenAIResponse(responseContent, request.UserId);
                    
                    _logger.LogInformation(
                        "OpenAI success: recommendationId={Id}, tokens={Tokens}, cost=${Cost:F4}, confidence={Confidence:P0}",
                        recommendation.RecommendationId, recommendation.TokensUsed, recommendation.EstimatedCost, recommendation.ConfidenceScore);
                    
                    return recommendation;
                }

                _logger.LogWarning(
                    "OpenAI API error (attempt {Attempt}/{Max}): {StatusCode} - {Reason}",
                    attempt, _options.MaxRetries, response.StatusCode, response.ReasonPhrase);

                lastException = new HttpRequestException($"OpenAI API returned {response.StatusCode}");

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // Exponential backoff
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI API exception (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
        }

        throw new InvalidOperationException($"OpenAI API failed after {_options.MaxRetries} attempts", lastException);
    }

    public async Task<AIRecommendation> GetRetirementAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are the primary financial advisor providing comprehensive retirement planning analysis.",
            UserPrompt = "Analyze my retirement readiness and provide detailed recommendations.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetCashOptimizationAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are the primary financial advisor analyzing cash management and liquidity strategies.",
            UserPrompt = "Analyze my cash accounts and suggest optimal allocation strategies for emergency funds, liquidity, and yield optimization.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetRebalancingAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are the primary financial advisor analyzing portfolio allocation strategies.",
            UserPrompt = "Analyze my portfolio allocation and suggest optimal rebalancing strategies.",
            Temperature = 0.3m
        };

        return await GetRecommendationAsync(request);
    }

    private AIRecommendation ParseOpenAIResponse(string jsonResponse, string userId)
    {
        var json = JsonDocument.Parse(jsonResponse);
        var root = json.RootElement;

        // Extract the AI's response text
        var choice = root.GetProperty("choices")[0];
        var message = choice.GetProperty("message");
        var responseText = message.GetProperty("content").GetString() ?? string.Empty;

        // Extract usage information
        var usage = root.GetProperty("usage");
        var promptTokens = usage.GetProperty("prompt_tokens").GetInt32();
        var completionTokens = usage.GetProperty("completion_tokens").GetInt32();
        var totalTokens = usage.GetProperty("total_tokens").GetInt32();

        // Calculate cost based on GPT-4 pricing
        // GPT-4: $0.03/1K prompt tokens, $0.06/1K completion tokens
        // GPT-5 (when available): pricing TBD, using GPT-4 as proxy
        var estimatedCost = (promptTokens * _options.InputCostPerMTok / 1_000_000m) +
                           (completionTokens * _options.OutputCostPerMTok / 1_000_000m);

        // Create structured recommendation
        var recommendation = new AIRecommendation
        {
            RecommendationId = Guid.NewGuid().ToString(),
            ServiceName = ServiceName,
            ModelVersion = ModelVersion,
            RecommendationText = responseText,
            GeneratedAt = DateTime.UtcNow,
            ConfidenceScore = 0.85m, // OpenAI doesn't provide confidence - using default
            TokensUsed = totalTokens,
            EstimatedCost = estimatedCost,
            ActionItems = ExtractActionItems(responseText),
            Metadata = new Dictionary<string, object>
            {
                { "model", ModelVersion },
                { "promptTokens", promptTokens },
                { "completionTokens", completionTokens },
                { "totalTokens", totalTokens },
                { "finishReason", choice.GetProperty("finish_reason").GetString() ?? "unknown" }
            }
        };

        return recommendation;
    }

    private List<string> ExtractActionItems(string responseText)
    {
        var actionItems = new List<string>();

        // Split into lines and look for action-oriented bullets
        var lines = responseText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            
            // Match bullet points or numbered items
            if (trimmed.StartsWith("-") || trimmed.StartsWith("•") || 
                trimmed.StartsWith("*") || char.IsDigit(trimmed[0]))
            {
                // Look for action verbs
                var actionVerbs = new[] { "Move", "Transfer", "Consider", "Review", "Adjust", 
                                         "Increase", "Decrease", "Allocate", "Rebalance", "Invest" };
                
                if (actionVerbs.Any(verb => trimmed.Contains(verb, StringComparison.OrdinalIgnoreCase)))
                {
                    // Clean up the bullet point
                    var cleaned = trimmed.TrimStart('-', '•', '*', ' ', '\t');
                    // Remove leading digits and punctuation
                    while (!string.IsNullOrWhiteSpace(cleaned) && 
                           (char.IsDigit(cleaned[0]) || cleaned[0] == '.' || cleaned[0] == ')' || cleaned[0] == ' '))
                    {
                        cleaned = cleaned.Substring(1);
                    }
                    
                    if (!string.IsNullOrWhiteSpace(cleaned))
                    {
                        actionItems.Add(cleaned);
                    }
                }
            }
        }

        return actionItems;
    }
}
