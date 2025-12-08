using PFMP_API.Services;
using PFMP_API.Services.AI;
using PFMP_API.Models;

namespace PFMP_API.Tests.Fixtures;

/// <summary>
/// Deterministic test double for IAIService. Returns predictable data for unit tests.
/// Only the methods actually used by current tests need semantic meaning; others return minimal placeholders.
/// </summary>
public class FakeAiService : IAIService
{
    private readonly string _text;
    public FakeAiService(string text = "Test AI Analysis") => _text = text;

    public Task<List<CreateTaskRequest>> GenerateTaskRecommendationsAsync(int userId)
        => Task.FromResult(new List<CreateTaskRequest>());

    public Task<TaskPriority> RecommendTaskPriorityAsync(CreateTaskRequest task)
        => Task.FromResult(TaskPriority.Medium);

    public Task<TaskType> CategorizeTaskAsync(string title, string description)
        => Task.FromResult(TaskType.Rebalancing);

    public Task<string> AnalyzePortfolioAsync(int userId)
        => Task.FromResult(_text + $" for user {userId}");

    public Task<List<Alert>> GenerateMarketAlertsAsync(int userId)
        => Task.FromResult(new List<Alert>());

    public Task<string> ExplainRecommendationAsync(string recommendation)
        => Task.FromResult("Explanation: " + recommendation);
}

/// <summary>
/// Fake implementation of IAIIntelligenceService for testing
/// </summary>
public class FakeAIIntelligenceService : IAIIntelligenceService
{
    public Task<AIAnalysisResult> AnalyzeUserFinancesAsync(int userId, bool forceAnalysis = false)
    {
        return Task.FromResult(new AIAnalysisResult
        {
            UserId = userId,
            AnalyzedAt = DateTime.UtcNow,
            Summary = "Test analysis complete",
            TotalCost = 0.05m,
            TotalTokens = 1000,
            Duration = TimeSpan.FromSeconds(2)
        });
    }

    public Task<ConsensusResult> AnalyzeCashOptimizationAsync(int userId)
    {
        return Task.FromResult(new ConsensusResult
        {
            ConservativeAdvice = new AIRecommendation { RecommendationText = "Conservative cash recommendation", ConfidenceScore = 0.90m },
            AggressiveAdvice = new AIRecommendation { RecommendationText = "Aggressive cash recommendation", ConfidenceScore = 0.88m },
            ConsensusRecommendation = "Consensus cash recommendation",
            AgreementScore = 0.85m,
            HasConsensus = true
        });
    }

    public Task<ConsensusResult> AnalyzePortfolioRebalancingAsync(int userId)
    {
        return Task.FromResult(new ConsensusResult
        {
            ConservativeAdvice = new AIRecommendation { RecommendationText = "Conservative rebalancing", ConfidenceScore = 0.85m },
            AggressiveAdvice = new AIRecommendation { RecommendationText = "Aggressive rebalancing", ConfidenceScore = 0.82m },
            ConsensusRecommendation = "Consensus rebalancing",
            AgreementScore = 0.80m,
            HasConsensus = true
        });
    }

    public Task<ConsensusResult> AnalyzeTSPAllocationAsync(int userId)
    {
        return Task.FromResult(new ConsensusResult
        {
            ConservativeAdvice = new AIRecommendation { RecommendationText = "Conservative TSP allocation", ConfidenceScore = 0.80m },
            AggressiveAdvice = new AIRecommendation { RecommendationText = "Aggressive TSP allocation", ConfidenceScore = 0.78m },
            ConsensusRecommendation = "Consensus TSP allocation",
            AgreementScore = 0.75m,
            HasConsensus = true
        });
    }

    public Task<ConsensusResult> AnalyzeRiskAlignmentAsync(int userId)
    {
        return Task.FromResult(new ConsensusResult
        {
            ConservativeAdvice = new AIRecommendation { RecommendationText = "Conservative risk alignment", ConfidenceScore = 0.90m },
            AggressiveAdvice = new AIRecommendation { RecommendationText = "Aggressive risk alignment", ConfidenceScore = 0.87m },
            ConsensusRecommendation = "Consensus risk alignment",
            AgreementScore = 0.85m,
            HasConsensus = true
        });
    }

    public Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId)
    {
        return Task.FromResult(new Advice
        {
            UserId = userId,
            Status = "Proposed",
            ConsensusText = "Test advice from alert",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    public Task<AIChatResponse> GetChatResponseAsync(int userId, string message, int? conversationId = null)
    {
        return Task.FromResult(new AIChatResponse
        {
            ConversationId = conversationId ?? 1,
            Response = "Chat response: " + message,
            UsedConsensus = false,
            TokensUsed = 100,
            Cost = 0.01m,
            CanConvertToAdvice = false
        });
    }

    public Task<Advice> ConvertChatToAdviceAsync(int conversationId, int userId, string reasoning)
    {
        return Task.FromResult(new Advice
        {
            UserId = userId,
            Status = "Proposed",
            ConsensusText = "Advice from chat: " + reasoning,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    public Task RecordUserActionAsync(int userId, string actionType, string actionSummary, 
        decimal? amount = null, string? assetClass = null, int? sourceAdviceId = null)
    {
        return Task.CompletedTask;
    }

    public bool ShouldGenerateAlert(ConsensusResult result, int userId)
    {
        return result.AgreementScore < 0.6m; // Generate alert if low agreement
    }

    public Task<bool> ShouldGenerateAdviceAsync(ConsensusResult result, int userId, string adviceType)
    {
        return Task.FromResult(result.AgreementScore > 0.7m); // Generate advice if good agreement
    }

    public Task<AIPromptPreview> PreviewAnalysisPromptAsync(int userId, string analysisType)
    {
        return Task.FromResult(new AIPromptPreview
        {
            UserId = userId,
            AnalysisType = analysisType,
            SystemPrompt = "Test system prompt",
            CacheableContext = "Test cacheable context",
            AnalysisContext = "Test analysis context",
            FullPrompt = "Test full prompt",
            EstimatedTokens = 500,
            GeneratedAt = DateTime.UtcNow
        });
    }
}
