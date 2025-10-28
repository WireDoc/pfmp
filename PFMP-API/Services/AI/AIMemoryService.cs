using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using System.Text;
using System.Text.Json;

namespace PFMP_API.Services.AI
{
    /// <summary>
    /// Manages AI memory: conversations, user actions, learned preferences, and market context
    /// </summary>
    public class AIMemoryService : IAIMemoryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AIMemoryService> _logger;

        public AIMemoryService(ApplicationDbContext context, ILogger<AIMemoryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ===== Conversation Memory =====

        public async Task<AIConversation> StartConversationAsync(int userId, string conversationType = "Chat")
        {
            var conversation = new AIConversation
            {
                UserId = userId,
                ConversationType = conversationType,
                StartedAt = DateTime.UtcNow
            };

            _context.AIConversations.Add(conversation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Started conversation {ConversationId} for user {UserId}", 
                conversation.ConversationId, userId);

            return conversation;
        }

        public async Task<AIConversation?> GetActiveConversationAsync(int userId)
        {
            return await _context.AIConversations
                .Where(c => c.UserId == userId && c.EndedAt == null)
                .OrderByDescending(c => c.StartedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<AIMessage> AddMessageAsync(int conversationId, string role, string content,
            string? modelUsed = null, int? tokensUsed = null, decimal? cost = null,
            bool usedConsensus = false, decimal? agreementScore = null)
        {
            var message = new AIMessage
            {
                ConversationId = conversationId,
                Role = role,
                Content = content,
                ModelUsed = modelUsed,
                TokensUsed = tokensUsed,
                MessageCost = cost,
                UsedConsensus = usedConsensus,
                AgreementScore = agreementScore,
                SentAt = DateTime.UtcNow
            };

            _context.AIMessages.Add(message);

            // Update conversation totals
            var conversation = await _context.AIConversations.FindAsync(conversationId);
            if (conversation != null)
            {
                conversation.MessageCount++;
                if (tokensUsed.HasValue)
                    conversation.TotalTokensUsed += tokensUsed.Value;
                if (cost.HasValue)
                    conversation.TotalCost += cost.Value;
            }

            await _context.SaveChangesAsync();
            return message;
        }

        public async Task<AIConversation> EndConversationAsync(int conversationId, string? summary = null)
        {
            var conversation = await _context.AIConversations
                .FindAsync(conversationId)
                ?? throw new InvalidOperationException($"Conversation {conversationId} not found");

            conversation.EndedAt = DateTime.UtcNow;
            conversation.ConversationSummary = summary;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Ended conversation {ConversationId}, {MessageCount} messages, ${Cost:F4}",
                conversationId, conversation.MessageCount, conversation.TotalCost);

            return conversation;
        }

        public async Task<List<AIMessage>> GetConversationHistoryAsync(int conversationId, int limit = 50)
        {
            return await _context.AIMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.SentAt)
                .Take(limit)
                .ToListAsync();
        }

        // ===== Action Memory =====

        public async Task<AIActionMemory> RecordActionAsync(int userId, string actionType, string actionSummary,
            decimal? amount = null, string? assetClass = null, string[]? accountsAffected = null,
            int? sourceAdviceId = null, int? sourceAlertId = null, int expirationDays = 30,
            bool isSignificant = true)
        {
            var action = new AIActionMemory
            {
                UserId = userId,
                ActionType = actionType,
                ActionSummary = actionSummary,
                AmountMoved = amount,
                AssetClass = assetClass,
                AccountsAffected = accountsAffected != null ? JsonSerializer.Serialize(accountsAffected) : null,
                SourceAdviceId = sourceAdviceId,
                SourceAlertId = sourceAlertId,
                ActionDate = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(expirationDays),
                IsSignificant = isSignificant
            };

            _context.AIActionMemories.Add(action);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Recorded action {ActionType} for user {UserId}: {Summary}",
                actionType, userId, actionSummary);

            return action;
        }

        public async Task<List<AIActionMemory>> GetRecentActionsAsync(int userId, int days = 30)
        {
            var cutoff = DateTime.UtcNow.AddDays(-days);
            return await _context.AIActionMemories
                .Where(a => a.UserId == userId && a.ActionDate >= cutoff)
                .OrderByDescending(a => a.ActionDate)
                .ToListAsync();
        }

        public async Task<List<AIActionMemory>> GetSignificantActionsAsync(int userId, int days = 90)
        {
            var cutoff = DateTime.UtcNow.AddDays(-days);
            return await _context.AIActionMemories
                .Where(a => a.UserId == userId && a.IsSignificant && a.ActionDate >= cutoff)
                .OrderByDescending(a => a.ActionDate)
                .ToListAsync();
        }

        public async Task IncrementActionReferenceAsync(int actionMemoryId)
        {
            var action = await _context.AIActionMemories.FindAsync(actionMemoryId);
            if (action != null)
            {
                action.Referenced = true;
                action.ReferenceCount++;
                await _context.SaveChangesAsync();
            }
        }

        // ===== User Memory (Preferences & Patterns) =====

        public async Task<AIUserMemory> LearnPreferenceAsync(int userId, string memoryKey, string memoryValue,
            string? context = null, string memoryType = "Preference", int? sourceConversationId = null,
            int? sourceAdviceId = null)
        {
            // Check if memory already exists
            var existing = await GetMemoryAsync(userId, memoryKey);
            if (existing != null)
            {
                // Reinforce existing memory
                return await ReinforceMemoryAsync(userId, memoryKey) ?? existing;
            }

            // Create new memory
            var memory = new AIUserMemory
            {
                UserId = userId,
                MemoryType = memoryType,
                MemoryKey = memoryKey,
                MemoryValue = memoryValue,
                Context = context,
                ConfidenceScore = 50, // Start at 50%
                LearnedAt = DateTime.UtcNow,
                LastReinforcedAt = DateTime.UtcNow,
                ReinforcementCount = 1,
                SourceConversationId = sourceConversationId,
                SourceAdviceId = sourceAdviceId
            };

            _context.AIUserMemories.Add(memory);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Learned new preference for user {UserId}: {Key} = {Value}",
                userId, memoryKey, memoryValue);

            return memory;
        }

        public async Task<AIUserMemory?> ReinforceMemoryAsync(int userId, string memoryKey)
        {
            var memory = await GetMemoryAsync(userId, memoryKey);
            if (memory == null || !memory.IsActive) return null;

            // Increase confidence (cap at 100)
            memory.ConfidenceScore = Math.Min(100, memory.ConfidenceScore + 10);
            memory.ReinforcementCount++;
            memory.LastReinforcedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Reinforced memory {Key} for user {UserId}, confidence now {Confidence}%",
                memoryKey, userId, memory.ConfidenceScore);

            return memory;
        }

        public async Task<AIUserMemory?> GetMemoryAsync(int userId, string memoryKey)
        {
            return await _context.AIUserMemories
                .FirstOrDefaultAsync(m => m.UserId == userId && m.MemoryKey == memoryKey && m.IsActive);
        }

        public async Task<List<AIUserMemory>> GetActiveMemoriesAsync(int userId, int minConfidence = 50)
        {
            return await _context.AIUserMemories
                .Where(m => m.UserId == userId && m.IsActive && m.ConfidenceScore >= minConfidence)
                .OrderByDescending(m => m.ConfidenceScore)
                .ToListAsync();
        }

        public async Task<List<AIUserMemory>> GetMemoriesByTypeAsync(int userId, string memoryType)
        {
            return await _context.AIUserMemories
                .Where(m => m.UserId == userId && m.MemoryType == memoryType && m.IsActive)
                .OrderByDescending(m => m.ConfidenceScore)
                .ToListAsync();
        }

        public async Task<bool> DeprecateMemoryAsync(int userMemoryId, string reason)
        {
            var memory = await _context.AIUserMemories.FindAsync(userMemoryId);
            if (memory == null) return false;

            memory.IsActive = false;
            memory.DeprecatedAt = DateTime.UtcNow;
            memory.DeprecationReason = reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deprecated memory {MemoryId}: {Reason}", userMemoryId, reason);
            return true;
        }

        // ===== Context Building =====

        public async Task<string> BuildMemoryContextAsync(int userId, bool includeRecent = true,
            bool includePreferences = true, int recentDays = 30)
        {
            var context = new StringBuilder();
            context.AppendLine("ADVISOR MEMORY ABOUT USER:");
            context.AppendLine();

            // Recent actions
            if (includeRecent)
            {
                var actions = await GetRecentActionsAsync(userId, recentDays);
                if (actions.Any())
                {
                    context.AppendLine($"RECENT ACTIONS (Last {recentDays} days):");
                    foreach (var action in actions.Take(5))
                    {
                        var daysAgo = (DateTime.UtcNow - action.ActionDate).Days;
                        context.AppendLine($"- [{daysAgo} days ago] {action.ActionSummary}");
                        if (action.SourceAdviceId.HasValue)
                        {
                            context.AppendLine($"  (Following AI advice)");
                        }
                    }
                    context.AppendLine();
                }
            }

            // Learned preferences
            if (includePreferences)
            {
                var preferences = await GetActiveMemoriesAsync(userId, minConfidence: 60);
                if (preferences.Any())
                {
                    context.AppendLine("LEARNED PREFERENCES:");
                    foreach (var pref in preferences)
                    {
                        context.AppendLine($"- {pref.MemoryValue} (confidence: {pref.ConfidenceScore}%)");
                    }
                    context.AppendLine();
                }
            }

            // Recent conversation context
            var activeConvo = await GetActiveConversationAsync(userId);
            if (activeConvo != null)
            {
                var recentMessages = await GetConversationHistoryAsync(activeConvo.ConversationId, limit: 10);
                if (recentMessages.Any())
                {
                    context.AppendLine("RECENT CONVERSATION:");
                    foreach (var msg in recentMessages.TakeLast(3))
                    {
                        var role = msg.Role == "user" ? "User" : "Assistant";
                        var snippet = msg.Content.Length > 100 
                            ? msg.Content.Substring(0, 97) + "..." 
                            : msg.Content;
                        context.AppendLine($"{role}: \"{snippet}\"");
                    }
                    context.AppendLine();
                }
            }

            // Important context
            var significantActions = await GetSignificantActionsAsync(userId, days: 14);
            if (significantActions.Any())
            {
                context.AppendLine("⚠️ IMPORTANT CONTEXT:");
                context.AppendLine($"- User made {significantActions.Count} significant financial moves in past 14 days");
                context.AppendLine("- Good advisors suggest 'hold' periods after major changes");
                context.AppendLine("- Don't recommend major portfolio changes unless urgent");
                context.AppendLine();
            }

            return context.ToString();
        }

        public async Task<string> BuildActionSummaryAsync(int userId, int days = 30)
        {
            var actions = await GetRecentActionsAsync(userId, days);
            if (!actions.Any())
                return $"No recorded financial actions in the past {days} days.";

            var summary = new StringBuilder();
            summary.AppendLine($"User has made {actions.Count} financial actions in the past {days} days:");
            foreach (var action in actions.Take(10))
            {
                var daysAgo = (DateTime.UtcNow - action.ActionDate).Days;
                summary.AppendLine($"- [{daysAgo}d ago] {action.ActionSummary}");
            }

            return summary.ToString();
        }

        public async Task<string> BuildPreferenceSummaryAsync(int userId, int minConfidence = 70)
        {
            var preferences = await GetActiveMemoriesAsync(userId, minConfidence);
            if (!preferences.Any())
                return "No strong learned preferences yet.";

            var summary = new StringBuilder();
            summary.AppendLine("User preferences:");
            foreach (var pref in preferences)
            {
                summary.AppendLine($"- {pref.MemoryValue} ({pref.ConfidenceScore}% confidence)");
            }

            return summary.ToString();
        }

        // ===== Market Context =====

        public async Task<MarketContext?> GetLatestMarketContextAsync()
        {
            return await _context.MarketContexts
                .OrderByDescending(m => m.ContextDate)
                .FirstOrDefaultAsync();
        }

        public async Task<MarketContext?> GetMarketContextAsync(DateTime date)
        {
            return await _context.MarketContexts
                .FirstOrDefaultAsync(m => m.ContextDate.Date == date.Date);
        }

        public async Task<List<MarketContext>> GetMarketContextRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.MarketContexts
                .Where(m => m.ContextDate >= startDate && m.ContextDate <= endDate)
                .OrderBy(m => m.ContextDate)
                .ToListAsync();
        }

        public async Task<string> BuildMarketContextSummaryAsync(int days = 30)
        {
            var endDate = DateTime.UtcNow;
            var startDate = endDate.AddDays(-days);
            var contexts = await GetMarketContextRangeAsync(startDate, endDate);

            if (!contexts.Any())
            {
                return "No market context available (news aggregation not yet running).";
            }

            var latest = contexts.OrderByDescending(c => c.ContextDate).First();
            var summary = new StringBuilder();
            summary.AppendLine($"CURRENT MARKET CONTEXT (Last {days} days):");
            summary.AppendLine($"- Date: {latest.ContextDate:yyyy-MM-dd}");
            summary.AppendLine($"- Sentiment: {latest.MarketSentiment}");
            summary.AppendLine($"- S&P 500 Change: {latest.SPYChange:+0.00;-0.00}%");
            summary.AppendLine($"- VIX: {latest.VIXLevel:F2} (volatility index)");
            
            if (latest.MajorEvents.Any())
            {
                summary.AppendLine("- Major Events: " + string.Join(", ", latest.MajorEvents));
            }
            
            summary.AppendLine();
            summary.AppendLine($"Summary: {latest.DailySummary}");

            return summary.ToString();
        }
    }
}
