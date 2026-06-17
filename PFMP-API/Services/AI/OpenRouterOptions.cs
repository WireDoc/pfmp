namespace PFMP_API.Services.AI;

/// <summary>
/// Configuration options for OpenRouter AI gateway.
/// Single config section drives both primary and verifier model instances.
/// </summary>
public class OpenRouterOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1/chat/completions";
    // Wave 22 Phase D — adopted `~provider/model-latest` aliases so model selection
    // auto-updates to the latest stable model in each family. See OpenRouter docs.
    public string PrimaryModel { get; set; } = "~google/gemini-pro-latest";
    public string VerifierModel { get; set; } = "~anthropic/claude-sonnet-latest";
    public string ChatModel { get; set; } = "~google/gemini-pro-latest";

    // Wave 22 Phase E — News slot. No consumer yet; reserved for the future
    // Market Context Awareness wave that will run a periodic Hangfire job to
    // summarize current headlines and write them into the AI prompt's
    // === MARKET CONTEXT === section. Flash is the right tier — cheap,
    // summarization-heavy workload.
    public string NewsModel { get; set; } = "~google/gemini-flash-latest";
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.3m;
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxRetries { get; set; } = 3;
    public bool EnableCostTracking { get; set; } = true;
    public string SiteName { get; set; } = "PFMP";
    public string SiteUrl { get; set; } = string.Empty;

    // Wave 22 — Fusion spike configuration
    public FusionOptions Fusion { get; set; } = new();
}

/// <summary>
/// Configuration for the OpenRouter Fusion multi-model deliberation spike.
/// See docs/waves/wave-22-ai-architecture-overhaul.md for the full plan.
/// </summary>
public class FusionOptions
{
    /// <summary>
    /// Feature flag — when true, the analyze path uses FusionAIAdvisor instead of PrimaryBackupAIAdvisor.
    /// Default false so production behavior is unchanged until the spike confirms.
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// The OpenRouter model slug for the Fusion meta-route. Always "openrouter/fusion" unless the slug changes.
    /// </summary>
    public string Model { get; set; } = "openrouter/fusion";

    /// <summary>
    /// Fusion preset: "quality" (default — frontier panelists + Opus judge) or "budget" (cheaper members).
    /// Per the Wave 22 spike decision: "quality" tests Fusion at its strongest.
    /// </summary>
    public string Preset { get; set; } = "quality";

    /// <summary>
    /// Optional override for the panelists. If empty, Fusion uses the preset defaults.
    /// Quality preset defaults: ~anthropic/claude-opus-latest, ~openai/gpt-latest, ~google/gemini-pro-latest
    /// </summary>
    public string[] AnalysisModels { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Optional override for the judge model. If null/empty, Fusion uses the preset default
    /// (~anthropic/claude-opus-latest for the quality preset).
    /// </summary>
    public string JudgeModel { get; set; } = string.Empty;

    /// <summary>
    /// Maximum tool calls (web search / fetch) allowed per panelist. Lower bounds the cost of search-heavy prompts.
    /// </summary>
    public int MaxToolCalls { get; set; } = 5;
}
