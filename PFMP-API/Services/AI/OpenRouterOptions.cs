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
    // Wave 24 — pinned to Gemini 3.1 Pro Preview (current Pro tier in the 3.x line).
    // The admin UI can swap any time via the AISettings table; this is the fallback.
    public string ChatModel { get; set; } = "google/gemini-3.1-pro-preview";

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

    // Wave 24 — Monthly hard cap on chat spend. When the user's MTD cost exceeds
    // this value, /api/chat/conversations/{id}/messages/stream returns 402 with
    // a message asking them to raise the cap or wait for the next billing cycle.
    // Default $20 — enough room for ~500 typical messages with caching warm.
    public ChatOptions Chat { get; set; } = new();
}

public class ChatOptions
{
    public decimal MonthlyCapUsd { get; set; } = 20m;

    /// <summary>
    /// Hard ceiling on snapshot staleness. Even when the source-change detector
    /// says nothing has updated, force a rebuild after this many minutes. Acts
    /// as a safety net for any source table the watermark query doesn't cover
    /// (e.g. global tables like TSPFundPrices that don't have a per-user link).
    /// Default 120 — captures "I'm back after lunch" without burning rebuild
    /// cycles during an active chat session.
    /// </summary>
    public int SnapshotMaxAgeMinutes { get; set; } = 120;
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
