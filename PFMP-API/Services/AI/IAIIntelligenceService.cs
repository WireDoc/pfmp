using PFMP_API.Models;
using PFMP_API.Services.AI;

namespace PFMP_API.Services.AI
{
    /// <summary>
    /// High-level AI intelligence orchestrator that coordinates dual AI advisors,
    /// memory systems, market context, and business logic
    /// </summary>
    public interface IAIIntelligenceService
    {
        // ===== Periodic Analysis =====
        /// <summary>
        /// Comprehensive analysis of user's complete financial profile
        /// Generates alerts and/or advice based on findings
        /// </summary>
        Task<AIAnalysisResult> AnalyzeUserFinancesAsync(int userId, bool forceAnalysis = false);

        // ===== Specific Area Analysis =====
        Task<ConsensusResult> AnalyzeCashOptimizationAsync(int userId);
        Task<ConsensusResult> AnalyzePortfolioRebalancingAsync(int userId);
        Task<ConsensusResult> AnalyzeTSPAllocationAsync(int userId);
        Task<ConsensusResult> AnalyzeRiskAlignmentAsync(int userId);

        // ===== Alert-to-Advice Conversion =====
        /// <summary>
        /// User clicked "Get AI Recommendation" on an alert
        /// Generates actionable advice from the alert
        /// </summary>
        Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId);

        // ===== Chatbot with Memory =====
        /// <summary>
        /// Conversational AI with full user context and memory
        /// </summary>
        Task<AIChatResponse> GetChatResponseAsync(int userId, string message, int? conversationId = null);
        
        /// <summary>
        /// Convert a chat insight into formal advice
        /// </summary>
        Task<Advice> ConvertChatToAdviceAsync(int conversationId, int userId, string reasoning);

        // ===== Memory Management =====
        Task RecordUserActionAsync(int userId, string actionType, string actionSummary, 
            decimal? amount = null, string? assetClass = null, int? sourceAdviceId = null);
        
        // ===== Decision Logic =====
        /// <summary>
        /// Should we generate an alert for this finding?
        /// </summary>
        bool ShouldGenerateAlert(ConsensusResult result, int userId);
        
        /// <summary>
        /// Should we generate advice for this finding? (checks throttle rules)
        /// </summary>
        Task<bool> ShouldGenerateAdviceAsync(ConsensusResult result, int userId, string adviceType);
    }

    /// <summary>
    /// Result of comprehensive financial analysis
    /// </summary>
    public class AIAnalysisResult
    {
        public int UserId { get; set; }
        public DateTime AnalyzedAt { get; set; }
        public List<Alert> AlertsGenerated { get; set; } = new();
        public List<Advice> AdviceGenerated { get; set; } = new();
        public decimal TotalCost { get; set; }
        public int TotalTokens { get; set; }
        public TimeSpan Duration { get; set; }
        public string Summary { get; set; } = string.Empty;
        public Dictionary<string, ConsensusResult> DetailedFindings { get; set; } = new();
    }

    /// <summary>
    /// Chat response with metadata
    /// </summary>
    public class AIChatResponse
    {
        public int ConversationId { get; set; }
        public string Response { get; set; } = string.Empty;
        public bool UsedConsensus { get; set; }
        public decimal? AgreementScore { get; set; }
        public string? ConservativeResponse { get; set; }
        public string? AggressiveResponse { get; set; }
        public int TokensUsed { get; set; }
        public decimal Cost { get; set; }
        public bool CanConvertToAdvice { get; set; }
        public string? ConvertReason { get; set; }
    }
}
