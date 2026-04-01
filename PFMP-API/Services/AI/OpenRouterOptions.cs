namespace PFMP_API.Services.AI;

/// <summary>
/// Configuration options for OpenRouter AI gateway.
/// Single config section drives both primary and verifier model instances.
/// </summary>
public class OpenRouterOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1/chat/completions";
    public string PrimaryModel { get; set; } = "google/gemini-3.1-pro-preview";
    public string VerifierModel { get; set; } = "anthropic/claude-sonnet-4.6";
    public string ChatModel { get; set; } = "google/gemini-3.1-pro-preview";
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.3m;
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxRetries { get; set; } = 3;
    public bool EnableCostTracking { get; set; } = true;
    public string SiteName { get; set; } = "PFMP";
    public string SiteUrl { get; set; } = string.Empty;
}
