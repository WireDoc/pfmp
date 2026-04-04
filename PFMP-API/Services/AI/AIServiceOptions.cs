namespace PFMP_API.Services.AI;

/// <summary>
/// Configuration options for dual AI consensus mechanism.
/// Both Primary and Verifier run through OpenRouter with different model roles.
/// </summary>
public class ConsensusOptions
{
    public string PrimaryService { get; set; } = "Primary";   // OpenRouter primary role
    public string BackupService { get; set; } = "Verifier";   // OpenRouter verifier role
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
