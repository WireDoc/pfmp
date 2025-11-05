namespace PFMP_API.Services.AI;

/// <summary>
/// Configuration options for OpenAI GPT service (Primary AI).
/// Supports both direct OpenAI API and Azure OpenAI Service.
/// </summary>
public class OpenAIServiceOptions
{
    public string Provider { get; set; } = "OpenAI"; // "OpenAI" or "Azure"
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.openai.com/v1";
    public string AzureEndpoint { get; set; } = string.Empty; // For Azure: https://your-resource.openai.azure.com/
    public string DeploymentName { get; set; } = string.Empty; // For Azure: your deployment name
    public string Model { get; set; } = "gpt-4"; // Will use GPT-5 when available
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.3m;
    public int TimeoutSeconds { get; set; } = 60;
    public int MaxRetries { get; set; } = 3;
    public bool EnableCostTracking { get; set; } = true;
    public decimal InputCostPerMTok { get; set; } = 5.0m;  // GPT-4 Turbo pricing
    public decimal OutputCostPerMTok { get; set; } = 15.0m; // GPT-4 Turbo pricing
}

/// <summary>
/// Configuration options for Anthropic Claude service.
/// </summary>
public class ClaudeServiceOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string ApiUrl { get; set; } = "https://api.anthropic.com/v1/messages";
    public string Model { get; set; } = "claude-3-5-sonnet-20241022";
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.3m;
    public int TimeoutSeconds { get; set; } = 60;
    public int MaxRetries { get; set; } = 3;
    public bool EnableCostTracking { get; set; } = true;
    public decimal InputCostPerMTok { get; set; } = 3.0m;
    public decimal OutputCostPerMTok { get; set; } = 15.0m;
    
    // Prompt Caching Configuration
    public bool EnablePromptCaching { get; set; } = true;
    public decimal CacheWriteCostPerMTok { get; set; } = 3.75m; // 25% premium
    public decimal CacheReadCostPerMTok { get; set; } = 0.30m;  // 90% discount
}

/// <summary>
/// Configuration options for Google Gemini service.
/// </summary>
public class GeminiServiceOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models";
    public string Model { get; set; } = "gemini-2.5-pro";
    public string FallbackModel { get; set; } = "gemini-2.5-flash";
    public string ChatbotModel { get; set; } = "gemini-2.5-flash";
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.5m;
    public int TimeoutSeconds { get; set; } = 60;
    public int MaxRetries { get; set; } = 3;
    public bool EnableCostTracking { get; set; } = true;
    public decimal InputCostPerMTok { get; set; } = 0.0m;
    public decimal OutputCostPerMTok { get; set; } = 0.0m;
    
    // Rate limit tracking (optional, for future enhancement)
    public RateLimitConfig? RateLimits { get; set; }
}

/// <summary>
/// Rate limit configuration for Gemini models.
/// </summary>
public class RateLimitConfig
{
    public ModelLimits? ProModel { get; set; }
    public ModelLimits? FlashModel { get; set; }
}

public class ModelLimits
{
    public int RequestsPerMinute { get; set; }
    public int TokensPerMinute { get; set; }
    public int RequestsPerDay { get; set; }
}

/// <summary>
/// Configuration options for dual AI consensus mechanism.
/// </summary>
public class ConsensusOptions
{
    public string PrimaryService { get; set; } = "OpenAI"; // Which service to use as primary
    public string BackupService { get; set; } = "Gemini";  // Which service to use as backup
    public decimal MinimumAgreementScore { get; set; } = 0.8m; // 80% agreement required
    public decimal MinimumConfidenceScore { get; set; } = 0.7m; // 70% confidence required
    public bool DefaultToConservative { get; set; } = true; // Tie-breaker
    public bool RequireBothResponses { get; set; } = false; // Can proceed with one if other fails
    public int ParallelCallTimeoutMs { get; set; } = 30000; // 30 seconds
}

/// <summary>
/// Configuration options for AI safety guards and validation.
/// </summary>
public class AISafetyOptions
{
    public bool EnableSafetyGuards { get; set; } = true;
    public decimal MinimumConfidenceThreshold { get; set; } = 0.6m;
    public List<string> ProhibitedRecommendations { get; set; } = new()
    {
        "invest all in crypto",
        "take out a loan to invest",
        "day trading",
        "time the market"
    };
    public bool RequireDisclaimer { get; set; } = true;
    public string DisclaimerText { get; set; } = "This is AI-generated advice. Consult a licensed financial advisor before making major financial decisions.";
}
