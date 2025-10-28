using PFMP_API.Models;

namespace PFMP_API.Services.AI
{
    /// <summary>
    /// Service for managing AI memory (conversations, actions, preferences)
    /// </summary>
    public interface IAIMemoryService
    {
        // ===== Conversation Memory =====
        Task<AIConversation> StartConversationAsync(int userId, string conversationType = "Chat");
        Task<AIConversation?> GetActiveConversationAsync(int userId);
        Task<AIMessage> AddMessageAsync(int conversationId, string role, string content, 
            string? modelUsed = null, int? tokensUsed = null, decimal? cost = null, 
            bool usedConsensus = false, decimal? agreementScore = null);
        Task<AIConversation> EndConversationAsync(int conversationId, string? summary = null);
        Task<List<AIMessage>> GetConversationHistoryAsync(int conversationId, int limit = 50);

        // ===== Action Memory =====
        Task<AIActionMemory> RecordActionAsync(int userId, string actionType, string actionSummary,
            decimal? amount = null, string? assetClass = null, string[]? accountsAffected = null,
            int? sourceAdviceId = null, int? sourceAlertId = null, int expirationDays = 30,
            bool isSignificant = true);
        Task<List<AIActionMemory>> GetRecentActionsAsync(int userId, int days = 30);
        Task<List<AIActionMemory>> GetSignificantActionsAsync(int userId, int days = 90);
        Task IncrementActionReferenceAsync(int actionMemoryId);

        // ===== User Memory (Preferences & Patterns) =====
        Task<AIUserMemory> LearnPreferenceAsync(int userId, string memoryKey, string memoryValue,
            string? context = null, string memoryType = "Preference", int? sourceConversationId = null,
            int? sourceAdviceId = null);
        Task<AIUserMemory?> ReinforceMemoryAsync(int userId, string memoryKey);
        Task<AIUserMemory?> GetMemoryAsync(int userId, string memoryKey);
        Task<List<AIUserMemory>> GetActiveMemoriesAsync(int userId, int minConfidence = 50);
        Task<List<AIUserMemory>> GetMemoriesByTypeAsync(int userId, string memoryType);
        Task<bool> DeprecateMemoryAsync(int userMemoryId, string reason);

        // ===== Context Building (for AI prompts) =====
        Task<string> BuildMemoryContextAsync(int userId, bool includeRecent = true, 
            bool includePreferences = true, int recentDays = 30);
        Task<string> BuildActionSummaryAsync(int userId, int days = 30);
        Task<string> BuildPreferenceSummaryAsync(int userId, int minConfidence = 70);
        
        // ===== Market Context =====
        Task<MarketContext?> GetLatestMarketContextAsync();
        Task<MarketContext?> GetMarketContextAsync(DateTime date);
        Task<List<MarketContext>> GetMarketContextRangeAsync(DateTime startDate, DateTime endDate);
        Task<string> BuildMarketContextSummaryAsync(int days = 30);
    }
}
