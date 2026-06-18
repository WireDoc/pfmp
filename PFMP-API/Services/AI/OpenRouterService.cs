using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PFMP_API.Models;

namespace PFMP_API.Services.AI;

/// <summary>
/// OpenRouter AI gateway service — unified IAIFinancialAdvisor implementation.
/// Two instances are registered (Primary + Verifier) with different model roles.
/// All models accessed via one API key and one HTTP format (OpenAI-compatible).
/// </summary>
public class OpenRouterService : IAIFinancialAdvisor
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenRouterOptions _options;
    private readonly IAIModelResolver _resolver;
    private readonly ILogger<OpenRouterService> _logger;
    private readonly string _role;            // "Primary" | "Verifier" | "News"
    private readonly AIModelSlot _defaultSlot; // Maps role → default slot when Mode = Analysis

    public string ServiceName => _role;
    // Wave 22 Phase C: model is now resolved per-request via AIModelResolver,
    // so there is no single static ModelVersion. We surface the appsettings default
    // as a hint for telemetry / display; the actual model used per call is logged.
    public string ModelVersion => _defaultSlot switch
    {
        AIModelSlot.Primary => _options.PrimaryModel,
        AIModelSlot.Verifier => _options.VerifierModel,
        AIModelSlot.News => _options.NewsModel,
        _ => _options.PrimaryModel
    };

    public OpenRouterService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        IAIModelResolver resolver,
        ILogger<OpenRouterService> logger,
        string role)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _resolver = resolver;
        _logger = logger;
        _role = role;

        _defaultSlot = role switch
        {
            "Primary" => AIModelSlot.Primary,
            "Verifier" => AIModelSlot.Verifier,
            "News" => AIModelSlot.News,
            _ => AIModelSlot.Primary
        };

        _logger.LogInformation("OpenRouterService initialized: role={Role}, defaultSlot={Slot}", _role, _defaultSlot);
    }

    public async Task<AIRecommendation> GetRecommendationAsync(AIPromptRequest request)
    {
        // Wave 22 Phase C: pick the slot from (Mode, role), then resolve config from
        // the DB-backed AIModelResolver (with appsettings fallback).
        // Mode.Chat on the Primary role uses the Chat slot's config; Mode.News uses
        // News regardless of role; otherwise use the role's default slot.
        var slot = (request.Mode, _role) switch
        {
            (AIPromptMode.Chat, "Primary") => AIModelSlot.Chat,
            (AIPromptMode.News, _) => AIModelSlot.News,
            _ => _defaultSlot
        };
        var config = await _resolver.ResolveAsync(slot);
        var modelToUse = config.Model;

        _logger.LogInformation(
            "OpenRouter API call: role={Role}, slot={Slot}, model={Model}, promptLength={Length}, temperature={Temp}",
            _role, slot, modelToUse, request.UserPrompt.Length, config.Temperature);

        // Build messages array
        var messages = new List<object>();

        if (!string.IsNullOrEmpty(request.SystemPrompt))
        {
            messages.Add(new { role = "system", content = request.SystemPrompt });
        }

        // Combine cacheable context + user prompt into one user message
        var userContent = new StringBuilder();
        if (!string.IsNullOrEmpty(request.CacheableContext))
        {
            userContent.AppendLine(request.CacheableContext);
            userContent.AppendLine();
        }
        userContent.Append(request.UserPrompt);

        messages.Add(new { role = "user", content = userContent.ToString() });

        // Per-request override (>0) takes precedence over resolved slot config.
        var maxTokens = request.MaxTokens > 0 ? request.MaxTokens : config.MaxTokens;
        var temperature = (double)(request.Temperature > 0 ? request.Temperature : config.Temperature);

        var payload = BuildPayload(modelToUse, messages, maxTokens, temperature, config);
        return await CallOpenRouterAsync(payload, request.UserId, modelToUse);
    }

    /// <summary>
    /// Builds the OpenRouter chat completion payload, including the optional
    /// reasoning + top_p params when the slot has them configured.
    /// </summary>
    private static Dictionary<string, object> BuildPayload(
        string model,
        List<object> messages,
        int maxTokens,
        double temperature,
        ResolvedModelConfig config)
    {
        var payload = new Dictionary<string, object>
        {
            ["model"] = model,
            ["messages"] = messages,
            ["max_tokens"] = maxTokens,
            ["temperature"] = temperature,
            // Opt in to OpenRouter usage accounting so the response includes the dollar
            // cost of the call in usage.cost. Without this, ParseResponse can't populate cost.
            ["usage"] = new { include = true }
        };

        if (config.TopP.HasValue)
            payload["top_p"] = (double)config.TopP.Value;

        if (config.ReasoningEffort.HasValue || config.ReasoningExclude.HasValue || config.ReasoningMaxTokens.HasValue)
        {
            var reasoning = new Dictionary<string, object>();
            if (config.ReasoningEffort.HasValue)
                reasoning["effort"] = config.ReasoningEffort.Value.ToString().ToLowerInvariant();
            if (config.ReasoningExclude.HasValue)
                reasoning["exclude"] = config.ReasoningExclude.Value;
            if (config.ReasoningMaxTokens.HasValue)
                reasoning["max_tokens"] = config.ReasoningMaxTokens.Value;
            payload["reasoning"] = reasoning;
        }

        return payload;
    }

    public async Task<AIRecommendation> GetRetirementAdviceAsync(string userId)
    {
        return await GetRecommendationAsync(new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a financial advisor specializing in retirement planning within a dual-AI financial management application. This request is generated by application logic, not a human user.",
            UserPrompt = "Analyze retirement readiness and provide actionable recommendations.",
            Temperature = 0.3m
        });
    }

    public async Task<AIRecommendation> GetRebalancingAdviceAsync(string userId)
    {
        return await GetRecommendationAsync(new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a portfolio analyst within a dual-AI financial management application. This request is generated by application logic, not a human user.",
            UserPrompt = "Analyze portfolio allocation and suggest rebalancing strategies.",
            Temperature = 0.3m
        });
    }

    public async Task<AIRecommendation> GetCashOptimizationAdviceAsync(string userId)
    {
        return await GetRecommendationAsync(new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a cash management specialist within a dual-AI financial management application. This request is generated by application logic, not a human user.",
            UserPrompt = "Analyze cash holdings and suggest optimization strategies including high-yield alternatives.",
            Temperature = 0.3m
        });
    }

    // ===== Private Helpers =====
    // Wave 22 Phase C: DetermineModel (the substring/mode → model picker) was
    // replaced by the inline (Mode, role) → AIModelSlot resolution in
    // GetRecommendationAsync above, which delegates to IAIModelResolver.

    private async Task<AIRecommendation> CallOpenRouterAsync(object payload, string userId, string modelUsed)
    {
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _options.MaxRetries; attempt++)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenRouter");
                client.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);

                var request = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

                if (!string.IsNullOrEmpty(_options.SiteName))
                    request.Headers.Add("X-Title", _options.SiteName);
                if (!string.IsNullOrEmpty(_options.SiteUrl))
                    request.Headers.Add("HTTP-Referer", _options.SiteUrl);

                var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    var recommendation = ParseResponse(responseBody, userId, modelUsed);

                    _logger.LogInformation(
                        "OpenRouter success: role={Role}, model={Model}, tokens={Tokens}, cost=${Cost:F4}",
                        _role, modelUsed, recommendation.TokensUsed, recommendation.EstimatedCost);

                    return recommendation;
                }

                // Handle rate limiting
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds ?? Math.Pow(2, attempt);
                    _logger.LogWarning(
                        "OpenRouter rate limit (attempt {Attempt}/{Max}), waiting {Seconds}s",
                        attempt, _options.MaxRetries, retryAfter);

                    if (attempt < _options.MaxRetries)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(retryAfter));
                        continue;
                    }
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning(
                    "OpenRouter error (attempt {Attempt}/{Max}): {StatusCode} - {Body}",
                    attempt, _options.MaxRetries, response.StatusCode,
                    errorBody.Length > 500 ? errorBody[..500] : errorBody);

                lastException = new HttpRequestException(
                    $"OpenRouter API returned {response.StatusCode}: {errorBody}");

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
            catch (TaskCanceledException ex) when (!ex.CancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("OpenRouter timeout (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenRouter exception (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;

                if (attempt < _options.MaxRetries)
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
            }
        }

        throw new InvalidOperationException(
            $"OpenRouter API failed after {_options.MaxRetries} attempts (role={_role}, defaultSlot={_defaultSlot})",
            lastException);
    }

    private AIRecommendation ParseResponse(string responseBody, string userId, string modelUsed)
    {
        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        // Extract content from OpenAI-compatible response
        var content = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "";

        // Extract token usage + dollar cost (cost is populated when we send usage:{include:true})
        int inputTokens = 0;
        int outputTokens = 0;
        int totalTokens = 0;
        decimal cost = 0m;
        bool costReported = false;

        if (root.TryGetProperty("usage", out var usage))
        {
            if (usage.TryGetProperty("prompt_tokens", out var pt))
                inputTokens = pt.GetInt32();
            if (usage.TryGetProperty("completion_tokens", out var ct))
                outputTokens = ct.GetInt32();
            if (usage.TryGetProperty("total_tokens", out var tt))
                totalTokens = tt.GetInt32();
            // OpenRouter reports actual dollar cost when usage.include=true is set on the request
            if (usage.TryGetProperty("cost", out var costEl) && costEl.ValueKind == JsonValueKind.Number)
            {
                cost = costEl.GetDecimal();
                costReported = true;
            }
        }

        if (totalTokens == 0)
            totalTokens = inputTokens + outputTokens;

        if (!costReported)
        {
            _logger.LogWarning(
                "OpenRouter response missing usage.cost — verify usage:{{include:true}} is set on the request (role={Role}, model={Model})",
                _role, modelUsed);
        }

        // Extract actual model from response (OpenRouter may return different variant)
        var actualModel = modelUsed;
        if (root.TryGetProperty("model", out var modelProp))
            actualModel = modelProp.GetString() ?? modelUsed;

        return new AIRecommendation
        {
            ServiceName = _role,
            ModelVersion = actualModel,
            RecommendationText = content,
            Reasoning = ExtractReasoning(content),
            ActionItems = ExtractActionItems(content),
            ConfidenceScore = EstimateConfidence(content),
            TokensUsed = totalTokens,
            EstimatedCost = cost,
            Metadata = new Dictionary<string, object>
            {
                ["userId"] = userId,
                ["inputTokens"] = inputTokens,
                ["outputTokens"] = outputTokens,
                ["role"] = _role,
                ["requestedModel"] = modelUsed,
                ["actualModel"] = actualModel,
                ["costReported"] = costReported
            }
        };
    }

    private static string ExtractReasoning(string content)
    {
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lines.Length > 0 ? lines[0] : content;
    }

    private static List<string> ExtractActionItems(string content)
    {
        var actionItems = new List<string>();
        var lines = content.Split('\n');

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("- ") ||
                trimmed.StartsWith("• ") ||
                trimmed.StartsWith("* ") ||
                (trimmed.Length > 1 && char.IsDigit(trimmed[0]) && trimmed.Contains('.')))
            {
                actionItems.Add(trimmed.TrimStart('-', '•', '*', ' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'));
            }
        }

        return actionItems;
    }

    private static decimal EstimateConfidence(string content)
    {
        // Basic heuristic — will enhance with structured output later
        return 0.75m;
    }
}
