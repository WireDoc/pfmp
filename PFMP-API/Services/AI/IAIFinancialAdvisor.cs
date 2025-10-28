namespace PFMP_API.Services.AI;

/// <summary>
/// Core interface for AI financial advisory services.
/// Implemented by Claude (conservative) and Gemini (aggressive) services.
/// </summary>
public interface IAIFinancialAdvisor
{
    /// <summary>
    /// Get AI recommendation for a specific financial question or scenario.
    /// </summary>
    Task<AIRecommendation> GetRecommendationAsync(AIPromptRequest request);

    /// <summary>
    /// Analyze user's retirement readiness and provide actionable advice.
    /// </summary>
    Task<AIRecommendation> GetRetirementAdviceAsync(string userId);

    /// <summary>
    /// Suggest portfolio rebalancing based on current allocation vs targets.
    /// </summary>
    Task<AIRecommendation> GetRebalancingAdviceAsync(string userId);

    /// <summary>
    /// Identify cash optimization opportunities (high-yield alternatives).
    /// </summary>
    Task<AIRecommendation> GetCashOptimizationAdviceAsync(string userId);

    /// <summary>
    /// Get the AI service name/identifier (e.g., "Claude", "Gemini").
    /// </summary>
    string ServiceName { get; }

    /// <summary>
    /// Get the current model version being used.
    /// </summary>
    string ModelVersion { get; }
}

/// <summary>
/// Orchestrates dual AI advisory system with consensus mechanism.
/// </summary>
public interface IDualAIAdvisor
{
    /// <summary>
    /// Get consensus recommendation from both AI advisors (Claude + Gemini).
    /// </summary>
    Task<ConsensusResult> GetConsensusRecommendationAsync(AIPromptRequest request);

    /// <summary>
    /// Get retirement advice with consensus from dual AI system.
    /// </summary>
    Task<ConsensusResult> GetRetirementConsensusAsync(string userId);

    /// <summary>
    /// Get rebalancing advice with consensus from dual AI system.
    /// </summary>
    Task<ConsensusResult> GetRebalancingConsensusAsync(string userId);
}

/// <summary>
/// Request object for AI prompts.
/// </summary>
public class AIPromptRequest
{
    public string UserId { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;
    public string UserPrompt { get; set; } = string.Empty;
    public int MaxTokens { get; set; } = 4000;
    public decimal Temperature { get; set; } = 0.3m;
    public Dictionary<string, object>? Context { get; set; }
}

/// <summary>
/// AI recommendation response from a single AI service.
/// </summary>
public class AIRecommendation
{
    public string RecommendationId { get; set; } = Guid.NewGuid().ToString();
    public string ServiceName { get; set; } = string.Empty;
    public string ModelVersion { get; set; } = string.Empty;
    public string RecommendationText { get; set; } = string.Empty;
    public string Reasoning { get; set; } = string.Empty;
    public List<string> ActionItems { get; set; } = new();
    public decimal ConfidenceScore { get; set; } // 0.0 to 1.0
    public int TokensUsed { get; set; }
    public decimal EstimatedCost { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// Consensus result from dual AI advisory system.
/// </summary>
public class ConsensusResult
{
    public string ConsensusId { get; set; } = Guid.NewGuid().ToString();
    public AIRecommendation ConservativeAdvice { get; set; } = new();
    public AIRecommendation AggressiveAdvice { get; set; } = new();
    public decimal AgreementScore { get; set; } // 0.0 to 1.0
    public bool HasConsensus { get; set; }
    public string? ConsensusRecommendation { get; set; }
    public string? DisagreementExplanation { get; set; }
    public List<string> CommonActionItems { get; set; } = new();
    public List<string> ConservativeOnlyItems { get; set; } = new();
    public List<string> AggressiveOnlyItems { get; set; } = new();
    public decimal TotalCost { get; set; }
    public int TotalTokens { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
