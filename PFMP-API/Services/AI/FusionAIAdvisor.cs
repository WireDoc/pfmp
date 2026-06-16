using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Wave 22 Phase A spike implementation: routes the analyze path through
/// OpenRouter Fusion (openrouter/fusion) instead of the Primary→Verifier flow.
///
/// Fusion runs a panel of 1–8 models in parallel with web search enabled,
/// then a judge model synthesizes structured JSON output: consensus,
/// contradictions, partial coverage, unique insights, blind spots.
///
/// For the spike, the structured output is flattened into ConsensusResult so the
/// existing AIIntelligenceService consumer code doesn't change. Phase B (if A
/// passes) will replace ConsensusResult with a Fusion-native result shape.
///
/// See: docs/waves/wave-22-ai-architecture-overhaul.md
/// </summary>
public class FusionAIAdvisor : IDualAIAdvisor
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<FusionAIAdvisor> _logger;

    public FusionAIAdvisor(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        ILogger<FusionAIAdvisor> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;

        _logger.LogInformation(
            "FusionAIAdvisor initialized: model={Model}, preset={Preset}, judgeOverride={Judge}, panelOverride={Panel}, maxToolCalls={MaxToolCalls}",
            _options.Fusion.Model,
            _options.Fusion.Preset,
            string.IsNullOrEmpty(_options.Fusion.JudgeModel) ? "(preset default)" : _options.Fusion.JudgeModel,
            _options.Fusion.AnalysisModels.Length == 0 ? "(preset default)" : string.Join(",", _options.Fusion.AnalysisModels),
            _options.Fusion.MaxToolCalls);
    }

    public async Task<ConsensusResult> GetConsensusRecommendationAsync(AIPromptRequest request)
    {
        var startTime = DateTime.UtcNow;

        _logger.LogInformation(
            "Fusion AI request started: userId={UserId}, promptLength={Length}, cacheableContextLength={CacheLength}",
            request.UserId, request.UserPrompt.Length, request.CacheableContext?.Length ?? 0);

        // Build messages array — same shape as OpenRouterService
        var messages = new List<object>();
        if (!string.IsNullOrEmpty(request.SystemPrompt))
            messages.Add(new { role = "system", content = request.SystemPrompt });

        var userContent = new StringBuilder();
        if (!string.IsNullOrEmpty(request.CacheableContext))
        {
            userContent.AppendLine(request.CacheableContext);
            userContent.AppendLine();
        }
        userContent.Append(request.UserPrompt);
        messages.Add(new { role = "user", content = userContent.ToString() });

        // Build the Fusion plugin object — only set overrides when explicitly configured
        var fusionPlugin = new Dictionary<string, object>
        {
            ["id"] = "fusion",
            ["preset"] = _options.Fusion.Preset,
            ["max_tool_calls"] = _options.Fusion.MaxToolCalls
        };
        if (_options.Fusion.AnalysisModels.Length > 0)
            fusionPlugin["analysis_models"] = _options.Fusion.AnalysisModels;
        if (!string.IsNullOrEmpty(_options.Fusion.JudgeModel))
            fusionPlugin["model"] = _options.Fusion.JudgeModel;

        var payload = new
        {
            model = _options.Fusion.Model,
            messages,
            max_tokens = request.MaxTokens > 0 ? request.MaxTokens : _options.MaxTokens,
            temperature = (double)(request.Temperature > 0 ? request.Temperature : _options.Temperature),
            usage = new { include = true },
            plugins = new object[] { fusionPlugin }
        };

        var (responseText, totalTokens, cost, actualModel, rawResponse) = await CallFusionAsync(payload, request.UserId);

        var elapsed = DateTime.UtcNow - startTime;
        _logger.LogInformation(
            "Fusion AI completed: userId={UserId}, tokens={Tokens}, cost=${Cost:F4}, elapsedMs={ElapsedMs}",
            request.UserId, totalTokens, cost, elapsed.TotalMilliseconds);

        // Wrap Fusion output as a ConsensusResult so AIIntelligenceService consumer code is unchanged.
        // The structured Fusion JSON lives in Metadata for the spike report; Phase B will surface it natively.
        var fusionAsRecommendation = new AIRecommendation
        {
            ServiceName = "Fusion",
            ModelVersion = actualModel,
            RecommendationText = responseText,
            Reasoning = ExtractFirstParagraph(responseText),
            ActionItems = new List<string>(),
            ConfidenceScore = 0.85m, // Placeholder for the spike; Phase B will derive from contradictions/coverage
            TokensUsed = totalTokens,
            EstimatedCost = cost,
            Metadata = new Dictionary<string, object>
            {
                ["userId"] = request.UserId,
                ["mode"] = "fusion",
                ["preset"] = _options.Fusion.Preset,
                ["rawResponse"] = rawResponse
            }
        };

        return new ConsensusResult
        {
            ConsensusId = Guid.NewGuid().ToString(),
            PrimaryRecommendation = fusionAsRecommendation,
            BackupCorroboration = null,
            HasConsensus = true,
            AgreementScore = 1.0m,
            ConsensusRecommendation = responseText,
            DisagreementExplanation = null,
            CommonActionItems = new List<string>(),
            ConservativeOnlyItems = new List<string>(),
            AggressiveOnlyItems = new List<string>(),
            TotalCost = cost,
            TotalTokens = totalTokens,
            GeneratedAt = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                ["mode"] = "fusion",
                ["fusionModel"] = _options.Fusion.Model,
                ["preset"] = _options.Fusion.Preset,
                ["elapsedMs"] = elapsed.TotalMilliseconds,
                ["rawResponse"] = rawResponse
            }
        };
    }

    public async Task<ConsensusResult> GetRetirementConsensusAsync(string userId)
    {
        return await GetConsensusRecommendationAsync(new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a financial advisor specializing in retirement planning. Provide comprehensive analysis.",
            UserPrompt = "Analyze retirement readiness and provide actionable recommendations.",
            Temperature = 0.3m
        });
    }

    public async Task<ConsensusResult> GetRebalancingConsensusAsync(string userId)
    {
        return await GetConsensusRecommendationAsync(new AIPromptRequest
        {
            UserId = userId,
            SystemPrompt = "You are a portfolio analyst. Analyze portfolio allocation and suggest rebalancing strategies.",
            UserPrompt = "Analyze portfolio allocation and suggest rebalancing.",
            Temperature = 0.3m
        });
    }

    private async Task<(string content, int totalTokens, decimal cost, string actualModel, string rawResponse)> CallFusionAsync(object payload, string userId)
    {
        Exception? lastException = null;

        for (int attempt = 1; attempt <= _options.MaxRetries; attempt++)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenRouter");
                client.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds * 2); // Fusion needs more time (panel + judge)

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
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Fusion error (attempt {Attempt}/{Max}): {StatusCode} - {Body}",
                        attempt, _options.MaxRetries, response.StatusCode,
                        body.Length > 500 ? body[..500] : body);

                    lastException = new HttpRequestException($"Fusion API returned {response.StatusCode}: {body}");
                    if (attempt < _options.MaxRetries)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                        continue;
                    }
                    throw lastException;
                }

                return ParseFusionResponse(body);
            }
            catch (TaskCanceledException ex) when (!ex.CancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("Fusion timeout (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;
                if (attempt < _options.MaxRetries)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }
            catch (Exception ex) when (attempt < _options.MaxRetries)
            {
                _logger.LogError(ex, "Fusion exception (attempt {Attempt}/{Max})", attempt, _options.MaxRetries);
                lastException = ex;
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }
        }

        throw new InvalidOperationException(
            $"Fusion API failed after {_options.MaxRetries} attempts",
            lastException);
    }

    private (string content, int totalTokens, decimal cost, string actualModel, string rawResponse) ParseFusionResponse(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var content = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "";

        int totalTokens = 0;
        decimal cost = 0m;
        bool costReported = false;

        if (root.TryGetProperty("usage", out var usage))
        {
            if (usage.TryGetProperty("total_tokens", out var tt))
                totalTokens = tt.GetInt32();
            if (usage.TryGetProperty("cost", out var costEl) && costEl.ValueKind == JsonValueKind.Number)
            {
                cost = costEl.GetDecimal();
                costReported = true;
            }
        }

        if (!costReported)
            _logger.LogWarning("Fusion response missing usage.cost — verify usage:{{include:true}} is set on the request");

        // ⚠️ Wave 22 Phase A finding: for Fusion responses, the response-level usage.cost
        // appears to report ONLY one underlying completion's cost (judge OR one panelist),
        // NOT the aggregate of panel + judge + tool calls. In the 2026-06-16 spike, this
        // value came back as $0.965 while the actual dashboard total was $2.305 (2.4× higher).
        // The OpenRouter dashboard is the source of truth for Fusion billing. To get the
        // real aggregate cost programmatically, call GET /api/v1/generation?id={id} after
        // each Fusion completion — deferred unless Fusion is revived as a Deep Dive feature.
        // See: docs/temp_fusion_spike_report.log and docs/waves/wave-22-ai-architecture-overhaul.md

        var actualModel = _options.Fusion.Model;
        if (root.TryGetProperty("model", out var modelProp))
            actualModel = modelProp.GetString() ?? actualModel;

        return (content, totalTokens, cost, actualModel, body);
    }

    private static string ExtractFirstParagraph(string content)
    {
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lines.Length > 0 ? lines[0] : content;
    }
}
