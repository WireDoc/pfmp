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
/// Workload classification — picks which configured model slot answers the request.
/// Replaces the legacy substring-sniff in OpenRouterService.DetermineModel.
/// </summary>
public enum AIPromptMode
{
    /// <summary>Long-form financial analysis (the dashboard analyze endpoints). Uses PrimaryModel / VerifierModel.</summary>
    Analysis = 0,
    /// <summary>Conversational turn (future chatbot). Uses ChatModel for the Primary role.</summary>
    Chat = 1,
    /// <summary>News aggregation / summarization (future Market Context Awareness wave). Uses NewsModel.</summary>
    News = 2
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

    /// <summary>
    /// Workload mode. Defaults to Analysis (the dashboard analyze flow).
    /// Set Chat for chatbot turns or News for the news aggregator to route through
    /// the appropriate model slot configured in AI:OpenRouter.
    /// </summary>
    public AIPromptMode Mode { get; set; } = AIPromptMode.Analysis;

    // Prompt Caching Support (Claude only)
    /// <summary>
    /// Cacheable context that stays constant across multiple requests.
    /// This will be marked with cache_control in Claude API calls.
    /// Examples: user profile, financial accounts, market context
    /// </summary>
    public string? CacheableContext { get; set; }
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
/// Consensus result from AI advisory system.
/// Supports both dual-panel (Conservative/Aggressive) and primary-backup models.
/// </summary>
public class ConsensusResult
{
    public string ConsensusId { get; set; } = Guid.NewGuid().ToString();
    
    // Legacy dual-panel properties (for backward compatibility)
    public AIRecommendation? ConservativeAdvice { get; set; }
    public AIRecommendation? AggressiveAdvice { get; set; }
    
    // New primary-backup properties
    public AIRecommendation? PrimaryRecommendation { get; set; }
    public AIRecommendation? BackupCorroboration { get; set; }
    
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
    public Dictionary<string, object>? Metadata { get; set; }
}
