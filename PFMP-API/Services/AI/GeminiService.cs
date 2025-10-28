using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Google Gemini 2.5 Pro/Flash service - Aggressive AI financial advisor.
/// Focuses on growth opportunities, tax optimization, and advanced strategies.
/// Uses gemini-2.5-pro for deep analysis, gemini-2.5-flash for chat/quick tasks.
/// </summary>
public class GeminiService : IAIFinancialAdvisor
{
    private readonly HttpClient _httpClient;
    private readonly GeminiServiceOptions _options;
    private readonly ILogger<GeminiService> _logger;

    public string ServiceName => "Gemini";
    public string ModelVersion => _options.Model;

    public GeminiService(
        HttpClient httpClient,
        IOptions<GeminiServiceOptions> options,
        ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        _httpClient.BaseAddress = new Uri(_options.ApiUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
    }

    public async Task<AIRecommendation> GetRecommendationAsync(AIPromptRequest request)
    {
        // Determine which model to use based on request context
        var modelToUse = DetermineModelForRequest(request);
        
        _logger.LogInformation(
            "Gemini API call: model={Model}, promptLength={Length}, temperature={Temp}",
            modelToUse, request.UserPrompt.Length, request.Temperature);

        var geminiRequest = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = $"{request.SystemPrompt}\n\n{request.UserPrompt}" }
                    }
                }
            },
            generationConfig = new
            {
                temperature = (double)(request.Temperature > 0 ? request.Temperature : _options.Temperature),
                maxOutputTokens = request.MaxTokens > 0 ? request.MaxTokens : _options.MaxTokens,
                topP = 0.95,
                topK = 40
            },
            safetySettings = new[]
            {
                new { category = "HARM_CATEGORY_DANGEROUS_CONTENT", threshold = "BLOCK_NONE" },
                new { category = "HARM_CATEGORY_HATE_SPEECH", threshold = "BLOCK_MEDIUM_AND_ABOVE" },
                new { category = "HARM_CATEGORY_HARASSMENT", threshold = "BLOCK_MEDIUM_AND_ABOVE" },
                new { category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold = "BLOCK_MEDIUM_AND_ABOVE" }
            }
        };

        AIRecommendation? recommendation = null;
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _options.MaxRetries; attempt++)
        {
            try
            {
                // Construct full URL: base + model + operation + key
                var fullUrl = $"{_options.ApiUrl}/{modelToUse}:generateContent?key={_options.ApiKey}";
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, fullUrl)
                {
                    Content = JsonContent.Create(geminiRequest)
                };
                
                var response = await _httpClient.SendAsync(httpRequest);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    recommendation = ParseGeminiResponse(responseContent, request.UserId, modelToUse);

                    _logger.LogInformation(
                        "Gemini success: model={Model}, recommendationId={Id}, tokens={Tokens}, cost=${Cost:F4}, confidence={Confidence:P0}",
                        modelToUse, recommendation.RecommendationId, recommendation.TokensUsed, recommendation.EstimatedCost, recommendation.ConfidenceScore);

                    return recommendation;
                }

                _logger.LogWarning(
                    "Gemini API error (attempt {Attempt}/{Max}): {StatusCode} - {Reason}",
                    attempt, _options.MaxRetries, response.StatusCode, response.ReasonPhrase);

                lastException = new HttpRequestException($"Gemini API returned {response.StatusCode}");

                // Try fallback model on rate limit errors
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests && 
                    modelToUse != _options.FallbackModel && 
                    attempt == 1)
                {
                    _logger.LogWarning("Rate limit hit, switching to fallback model: {Fallback}", _options.FallbackModel);
                    modelToUse = _options.FallbackModel;
                    continue;
                }

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // Exponential backoff
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini API exception (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
        }

        throw new InvalidOperationException($"Gemini API failed after {_options.MaxRetries} attempts", lastException);
    }

    public async Task<AIRecommendation> GetRetirementAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are an aggressive growth-focused financial advisor specializing in maximizing retirement wealth accumulation.",
            UserPrompt = "Analyze my retirement readiness and provide growth-oriented recommendations to accelerate wealth building.",
            Temperature = 0.5m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetRebalancingAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are an aggressive portfolio manager focused on maximizing risk-adjusted returns and identifying growth opportunities.",
            UserPrompt = "Analyze my portfolio allocation and suggest aggressive rebalancing strategies to optimize growth potential.",
            Temperature = 0.5m
        };

        return await GetRecommendationAsync(request);
    }

    public async Task<AIRecommendation> GetCashOptimizationAdviceAsync(string userId)
    {
        var request = new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are an aggressive financial strategist focused on maximizing returns from all assets including cash positions.",
            UserPrompt = "Analyze my cash holdings and suggest aggressive optimization strategies including high-yield alternatives and investment opportunities.",
            Temperature = 0.5m
        };

        return await GetRecommendationAsync(request);
    }

    /// <summary>
    /// Determines which Gemini model to use based on request characteristics.
    /// Pro model for deep analysis, Flash model for chat/quick tasks.
    /// </summary>
    private string DetermineModelForRequest(AIPromptRequest request)
    {
        // Use chatbot model if request seems conversational
        if (request.SystemPrompt?.Contains("chat", StringComparison.OrdinalIgnoreCase) == true ||
            request.SystemPrompt?.Contains("conversation", StringComparison.OrdinalIgnoreCase) == true ||
            request.UserPrompt?.Length < 500) // Short prompts likely chat
        {
            return _options.ChatbotModel;
        }

        // Use pro model for complex analysis
        return _options.Model;
    }

    private AIRecommendation ParseGeminiResponse(string responseContent, string userId, string modelUsed)
    {
        using var doc = JsonDocument.Parse(responseContent);
        var root = doc.RootElement;

        // Extract content from Gemini response
        var candidates = root.GetProperty("candidates");
        var content = candidates[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "";

        // Extract token usage (Gemini provides this in usageMetadata)
        var usage = root.GetProperty("usageMetadata");
        var inputTokens = usage.GetProperty("promptTokenCount").GetInt32();
        var outputTokens = usage.GetProperty("candidatesTokenCount").GetInt32();
        var totalTokens = inputTokens + outputTokens;

        // Calculate cost
        var estimatedCost = _options.EnableCostTracking
            ? (inputTokens / 1_000_000m * _options.InputCostPerMTok) +
              (outputTokens / 1_000_000m * _options.OutputCostPerMTok)
            : 0m;

        // Parse recommendation
        var recommendation = new AIRecommendation
        {
            ServiceName = ServiceName,
            ModelVersion = modelUsed, // Use actual model that responded
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
                ["finishReason"] = candidates[0].GetProperty("finishReason").GetString() ?? "STOP",
                ["modelUsed"] = modelUsed
            }
        };

        return recommendation;
    }

    private string ExtractReasoning(string content)
    {
        // TODO: Enhance with structured prompt
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lines.Length > 0 ? lines[0] : content;
    }

    private List<string> ExtractActionItems(string content)
    {
        // TODO: Enhance with structured prompt
        var actionItems = new List<string>();
        var lines = content.Split('\n');

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("- ") ||
                trimmed.StartsWith("• ") ||
                trimmed.StartsWith("* ") ||
                char.IsDigit(trimmed.FirstOrDefault()))
            {
                actionItems.Add(trimmed.TrimStart('-', '•', '*', ' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'));
            }
        }

        return actionItems;
    }

    private decimal EstimateConfidence(string content)
    {
        // TODO: Enhance with explicit confidence scoring
        var lowerContent = content.ToLower();

        if (lowerContent.Contains("strongly recommend") || lowerContent.Contains("definitely"))
            return 0.9m;
        if (lowerContent.Contains("recommend") || lowerContent.Contains("should"))
            return 0.8m;
        if (lowerContent.Contains("consider") || lowerContent.Contains("could"))
            return 0.75m;
        if (lowerContent.Contains("might") || lowerContent.Contains("potentially"))
            return 0.7m;

        return 0.8m; // Default higher confidence for aggressive advisor
    }
}
