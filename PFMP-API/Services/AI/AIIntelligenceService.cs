using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace PFMP_API.Services.AI
{
    /// <summary>
    /// Orchestrates AI financial analysis with memory, market context, and business rules
    /// </summary>
    public class AIIntelligenceService : IAIIntelligenceService
    {
        private readonly ApplicationDbContext _context;
        private readonly IDualAIAdvisor _dualAI;
        private readonly IAIMemoryService _memory;
        private readonly ILogger<AIIntelligenceService> _logger;

        // Throttle constants
        private const int SAME_ADVICE_COOLDOWN_DAYS = 14;
        private const int MAX_ADVICE_PER_WEEK = 3;
        private const int POST_ACTION_HOLD_DAYS = 14;
        private const decimal MIN_IMPACT_THRESHOLD = 0.05m; // 5% impact

        public AIIntelligenceService(
            ApplicationDbContext context,
            IDualAIAdvisor dualAI,
            IAIMemoryService memory,
            ILogger<AIIntelligenceService> logger)
        {
            _context = context;
            _dualAI = dualAI;
            _memory = memory;
            _logger = logger;
        }

        // ===== Periodic Analysis =====

        public async Task<AIAnalysisResult> AnalyzeUserFinancesAsync(int userId, bool forceAnalysis = false)
        {
            var stopwatch = Stopwatch.StartNew();
            var result = new AIAnalysisResult
            {
                UserId = userId,
                AnalyzedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Starting comprehensive financial analysis for user {UserId}", userId);

            try
            {
                // Run specific analyses in parallel
                var cashTask = AnalyzeCashOptimizationAsync(userId);
                var rebalanceTask = AnalyzePortfolioRebalancingAsync(userId);
                var tspTask = AnalyzeTSPAllocationAsync(userId);
                var riskTask = AnalyzeRiskAlignmentAsync(userId);

                await Task.WhenAll(cashTask, rebalanceTask, tspTask, riskTask);

                // Collect results
                result.DetailedFindings["CashOptimization"] = await cashTask;
                result.DetailedFindings["Rebalancing"] = await rebalanceTask;
                result.DetailedFindings["TSP"] = await tspTask;
                result.DetailedFindings["Risk"] = await riskTask;

                // Generate alerts and advice based on findings
                foreach (var finding in result.DetailedFindings)
                {
                    var consensus = finding.Value;
                    
                    // Track costs
                    result.TotalTokens += consensus.TotalTokens;
                    result.TotalCost += consensus.TotalCost;

                    // Generate alert if warranted
                    if (!forceAnalysis && ShouldGenerateAlert(consensus, userId))
                    {
                        var alert = await CreateAlertFromFindingAsync(userId, finding.Key, consensus);
                        result.AlertsGenerated.Add(alert);
                    }

                    // Generate advice if warranted (checks throttle)
                    if (await ShouldGenerateAdviceAsync(consensus, userId, finding.Key))
                    {
                        var advice = await CreateAdviceFromConsensusAsync(userId, finding.Key, consensus);
                        result.AdviceGenerated.Add(advice);
                    }
                }

                result.Duration = stopwatch.Elapsed;
                result.Summary = BuildAnalysisSummary(result);

                _logger.LogInformation(
                    "Analysis complete for user {UserId}: {AlertCount} alerts, {AdviceCount} advice, ${Cost:F4}, {Duration:F1}s",
                    userId, result.AlertsGenerated.Count, result.AdviceGenerated.Count, result.TotalCost, result.Duration.TotalSeconds);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing finances for user {UserId}", userId);
                throw;
            }
        }

        // ===== Specific Area Analysis =====

        public async Task<ConsensusResult> AnalyzeCashOptimizationAsync(int userId)
        {
            var context = await BuildAnalysisContextAsync(userId, "CashOptimization");
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = "You are a financial advisor analyzing cash management.",
                UserPrompt = context,
                MaxTokens = 3000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzePortfolioRebalancingAsync(int userId)
        {
            var context = await BuildAnalysisContextAsync(userId, "Rebalancing");
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = "You are a financial advisor analyzing portfolio allocation and rebalancing needs.",
                UserPrompt = context,
                MaxTokens = 3000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzeTSPAllocationAsync(int userId)
        {
            var context = await BuildAnalysisContextAsync(userId, "TSP");
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = "You are a federal employee retirement advisor analyzing TSP (Thrift Savings Plan) allocations.",
                UserPrompt = context,
                MaxTokens = 3000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzeRiskAlignmentAsync(int userId)
        {
            var context = await BuildAnalysisContextAsync(userId, "Risk");
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = "You are a financial advisor analyzing risk tolerance alignment.",
                UserPrompt = context,
                MaxTokens = 3000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        // ===== Alert-to-Advice Conversion =====

        public async Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId)
        {
            var alert = await _context.Alerts
                .Include(a => a.MarketContext)
                .FirstOrDefaultAsync(a => a.AlertId == alertId && a.UserId == userId)
                ?? throw new InvalidOperationException($"Alert {alertId} not found for user {userId}");

            _logger.LogInformation("Generating advice from alert {AlertId} for user {UserId}", alertId, userId);

            // Build context including alert details
            var context = await BuildAnalysisContextAsync(userId, "AlertAnalysis");
            context += $"\n\nALERT DETAILS:\n";
            context += $"- Title: {alert.Title}\n";
            context += $"- Message: {alert.Message}\n";
            context += $"- Severity: {alert.Severity}\n";
            context += $"- Category: {alert.Category}\n";
            context += $"- Impact Score: {alert.PortfolioImpactScore}/100\n\n";
            context += "Provide specific, actionable advice to address this alert.";

            var prompt = new AIPromptRequest
            {
                SystemPrompt = "You are a financial advisor providing actionable recommendations based on portfolio alerts.",
                UserPrompt = context,
                MaxTokens = 3000,
                Temperature = 0.3m
            };

            var consensus = await _dualAI.GetConsensusRecommendationAsync(prompt);

            // Create advice record
            var advice = await CreateAdviceFromConsensusAsync(userId, "AlertResponse", consensus, alert.AlertId);

            // Update alert
            alert.AIAnalyzed = true;
            alert.AIAnalyzedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return advice;
        }

        // ===== Chatbot with Memory =====

        public async Task<AIChatResponse> GetChatResponseAsync(int userId, string message, int? conversationId = null)
        {
            _logger.LogInformation("Processing chat message for user {UserId}", userId);

            // Get or create conversation
            AIConversation conversation;
            if (conversationId.HasValue)
            {
                conversation = await _context.AIConversations
                    .FindAsync(conversationId.Value)
                    ?? throw new InvalidOperationException($"Conversation {conversationId} not found");
            }
            else
            {
                conversation = await _memory.StartConversationAsync(userId);
            }

            // Record user message
            await _memory.AddMessageAsync(conversation.ConversationId, "user", message);

            // Build context with memory
            var context = await BuildChatContextAsync(userId, message);

            var prompt = new AIPromptRequest
            {
                SystemPrompt = BuildChatSystemPrompt(),
                UserPrompt = context,
                MaxTokens = 2000,
                Temperature = 0.4m
            };

            // Get dual AI response
            var consensus = await _dualAI.GetConsensusRecommendationAsync(prompt);

            // Record assistant message
            var responseText = consensus.ConsensusRecommendation ?? consensus.ConservativeAdvice?.RecommendationText ?? "I'm having trouble analyzing that right now.";
            
            await _memory.AddMessageAsync(
                conversation.ConversationId, 
                "assistant", 
                responseText,
                "dual-ai",
                consensus.TotalTokens,
                consensus.TotalCost,
                true,
                consensus.AgreementScore
            );

            // Determine if this can be converted to advice
            bool canConvert = consensus.HasConsensus && 
                             consensus.ConsensusRecommendation != null &&
                             consensus.ConservativeAdvice?.ActionItems.Count > 0;

            return new AIChatResponse
            {
                ConversationId = conversation.ConversationId,
                Response = responseText,
                UsedConsensus = true,
                AgreementScore = consensus.AgreementScore,
                ConservativeResponse = consensus.ConservativeAdvice?.RecommendationText,
                AggressiveResponse = consensus.AggressiveAdvice?.RecommendationText,
                TokensUsed = consensus.TotalTokens,
                Cost = consensus.TotalCost,
                CanConvertToAdvice = canConvert,
                ConvertReason = canConvert ? "This recommendation contains actionable items" : "No clear action items identified"
            };
        }

        public async Task<Advice> ConvertChatToAdviceAsync(int conversationId, int userId, string reasoning)
        {
            var conversation = await _context.AIConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId)
                ?? throw new InvalidOperationException($"Conversation {conversationId} not found");

            // Get last assistant message
            var lastMessage = conversation.Messages
                .Where(m => m.Role == "assistant")
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefault()
                ?? throw new InvalidOperationException("No assistant message found to convert");

            var marketContext = await _memory.GetLatestMarketContextAsync();

            var advice = new Advice
            {
                UserId = userId,
                Theme = "ChatConversation",
                Status = "Proposed",
                ConsensusText = lastMessage.Content,
                ConservativeRecommendation = lastMessage.Content, // Would need to parse from stored consensus
                ConfidenceScore = lastMessage.AgreementScore.HasValue ? (int)(lastMessage.AgreementScore.Value * 100) : 70,
                HasConsensus = lastMessage.UsedConsensus,
                AgreementScore = lastMessage.AgreementScore,
                AIGenerationCost = lastMessage.MessageCost,
                TotalTokensUsed = lastMessage.TokensUsed,
                MarketContextId = marketContext?.MarketContextId,
                GenerationMethod = "ChatConversion",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Advice.Add(advice);
            
            // Link advice to conversation
            conversation.GeneratedAdvice = true;
            conversation.RelatedAdviceId = advice.AdviceId;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("Converted chat conversation {ConversationId} to advice {AdviceId}",
                conversationId, advice.AdviceId);

            return advice;
        }

        // ===== Memory Management =====

        public async Task RecordUserActionAsync(int userId, string actionType, string actionSummary,
            decimal? amount = null, string? assetClass = null, int? sourceAdviceId = null)
        {
            await _memory.RecordActionAsync(
                userId, 
                actionType, 
                actionSummary, 
                amount, 
                assetClass, 
                sourceAdviceId: sourceAdviceId
            );

            _logger.LogInformation("Recorded action for user {UserId}: {ActionType} - {Summary}",
                userId, actionType, actionSummary);
        }

        // ===== Decision Logic =====

        public bool ShouldGenerateAlert(ConsensusResult result, int userId)
        {
            // Generate alert if:
            // 1. High confidence finding (70%+)
            // 2. Both AIs agree it's significant
            // 3. Has actionable recommendations

            if (result.ConservativeAdvice?.ConfidenceScore < 0.70m) return false;
            if (!result.HasConsensus) return false;
            if (result.ConservativeAdvice?.ActionItems.Count == 0) return false;

            return true;
        }

        public async Task<bool> ShouldGenerateAdviceAsync(ConsensusResult result, int userId, string adviceType)
        {
            // Rule 0: Must have actionable content
            if (result.ConservativeAdvice?.ActionItems.Count == 0) return false;
            if (result.ConservativeAdvice?.ConfidenceScore < 0.65m) return false;

            // Rule 1: No advice of same type within cooldown period
            var recentSimilar = await _context.Advice
                .Where(a => a.UserId == userId && 
                           a.Theme == adviceType &&
                           a.CreatedAt >= DateTime.UtcNow.AddDays(-SAME_ADVICE_COOLDOWN_DAYS))
                .AnyAsync();
            
            if (recentSimilar)
            {
                _logger.LogInformation("Throttle: Recent {AdviceType} advice exists for user {UserId}", adviceType, userId);
                return false;
            }

            // Rule 2: No more than 3 pieces of advice per week
            var thisWeek = await _context.Advice
                .Where(a => a.UserId == userId && 
                           a.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .CountAsync();
            
            if (thisWeek >= MAX_ADVICE_PER_WEEK)
            {
                _logger.LogInformation("Throttle: User {UserId} hit weekly advice limit ({Count}/3)", userId, thisWeek);
                return false;
            }

            // Rule 3: Check for recent significant actions (hold period)
            var recentActions = await _memory.GetSignificantActionsAsync(userId, POST_ACTION_HOLD_DAYS);
            if (recentActions.Any())
            {
                _logger.LogInformation("Throttle: User {UserId} has recent significant action, suggesting hold", userId);
                return false;
            }

            return true;
        }

        // ===== Helper Methods =====

        private async Task<string> BuildAnalysisContextAsync(int userId, string analysisType)
        {
            var context = new StringBuilder();

            // Market context
            var marketSummary = await _memory.BuildMarketContextSummaryAsync(30);
            context.AppendLine(marketSummary);
            context.AppendLine();

            // User memory (actions, preferences)
            var memoryContext = await _memory.BuildMemoryContextAsync(userId);
            context.AppendLine(memoryContext);

            // User financial profile
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                int birthYear = user.DateOfBirth?.Year ?? 1980;
                context.AppendLine("USER PROFILE:");
                context.AppendLine($"- Age: {DateTime.UtcNow.Year - birthYear}");
                context.AppendLine($"- Risk Tolerance: {user.RiskTolerance}/10");
                context.AppendLine();
            }

            // Get relevant financial data based on analysis type
            switch (analysisType)
            {
                case "CashOptimization":
                    context.AppendLine(await BuildCashContextAsync(userId));
                    break;
                case "Rebalancing":
                    context.AppendLine(await BuildPortfolioContextAsync(userId));
                    break;
                case "TSP":
                    context.AppendLine(await BuildTSPContextAsync(userId));
                    break;
                case "Risk":
                    context.AppendLine(await BuildRiskContextAsync(userId));
                    break;
            }

            return context.ToString();
        }

        private async Task<string> BuildChatContextAsync(int userId, string message)
        {
            var context = new StringBuilder();

            // System context
            context.AppendLine("You are a personal financial advisor having a conversation with your client.");
            context.AppendLine();

            // Memory context
            var memoryContext = await _memory.BuildMemoryContextAsync(userId, includeRecent: true, includePreferences: true);
            context.AppendLine(memoryContext);

            // Brief market context
            var marketSummary = await _memory.BuildMarketContextSummaryAsync(7);
            context.AppendLine(marketSummary);
            context.AppendLine();

            // User's question
            context.AppendLine($"USER QUESTION: {message}");

            return context.ToString();
        }

        private string BuildChatSystemPrompt()
        {
            return @"You are a knowledgeable financial advisor having a conversation with a client.

Guidelines:
- Be conversational but professional
- Reference their recent actions and preferences when relevant
- Consider current market conditions in your advice
- If you notice they just made a financial move, acknowledge it
- Suggest 'holding' or 'waiting' if they recently acted
- Be specific with numbers and timeframes
- End with a clear recommendation or next step

Remember: You have memory of past conversations and their financial actions.";
        }

        private async Task<string> BuildCashContextAsync(int userId)
        {
            var cashAccounts = await _context.CashAccounts
                .Where(c => c.UserId == userId)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("CASH ACCOUNTS:");
            decimal totalCash = 0;
            foreach (var account in cashAccounts)
            {
                sb.AppendLine($"- {account.Nickname}: ${account.Balance:N2} (APY: {account.InterestRateApr:P2})");
                totalCash += account.Balance;
            }
            sb.AppendLine($"Total Cash: ${totalCash:N2}");
            sb.AppendLine();
            sb.AppendLine("ANALYZE: Is cash optimally allocated? Any excess in low-yield accounts?");

            return sb.ToString();
        }

        private async Task<string> BuildPortfolioContextAsync(int userId)
        {
            var investments = await _context.InvestmentAccounts
                .Where(i => i.UserId == userId)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("INVESTMENT ACCOUNTS:");
            foreach (var inv in investments)
            {
                sb.AppendLine($"- {inv.AccountName}: ${inv.CurrentValue:N2}");
            }
            sb.AppendLine();
            sb.AppendLine("ANALYZE: Is portfolio properly balanced? Any rebalancing needed?");

            return sb.ToString();
        }

        private async Task<string> BuildTSPContextAsync(int userId)
        {
            // TSP-specific context
            var sb = new StringBuilder();
            sb.AppendLine("TSP ANALYSIS:");
            sb.AppendLine("- Check fund allocations (G, F, C, S, I, L funds)");
            sb.AppendLine("- Verify contribution rate vs. match");
            sb.AppendLine("- Age-appropriate allocation");
            
            return sb.ToString();
        }

        private async Task<string> BuildRiskContextAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            var sb = new StringBuilder();
            sb.AppendLine("RISK ANALYSIS:");
            sb.AppendLine($"- Stated Risk Tolerance: {user?.RiskTolerance ?? 5}/10");
            sb.AppendLine("- Check if actual portfolio matches risk tolerance");
            
            return sb.ToString();
        }

        private async Task<Alert> CreateAlertFromFindingAsync(int userId, string category, ConsensusResult consensus)
        {
            var marketContext = await _memory.GetLatestMarketContextAsync();

            var alert = new Alert
            {
                UserId = userId,
                Title = $"{category} Opportunity Identified",
                Message = consensus.ConsensusRecommendation ?? consensus.ConservativeAdvice?.RecommendationText ?? "Review needed",
                Severity = consensus.ConservativeAdvice?.ConfidenceScore >= 0.85m ? AlertSeverity.High : AlertSeverity.Medium,
                Category = MapCategoryToAlertCategory(category),
                IsActionable = true,
                PortfolioImpactScore = (int)((consensus.ConservativeAdvice?.ConfidenceScore ?? 0.5m) * 100),
                MarketContextId = marketContext?.MarketContextId,
                AIContext = $"AI Confidence: {consensus.ConservativeAdvice?.ConfidenceScore:P0}, Agreement: {consensus.AgreementScore:P0}",
                CreatedAt = DateTime.UtcNow
            };

            _context.Alerts.Add(alert);
            await _context.SaveChangesAsync();

            return alert;
        }

        private async Task<Advice> CreateAdviceFromConsensusAsync(int userId, string theme, ConsensusResult consensus, int? sourceAlertId = null)
        {
            var marketContext = await _memory.GetLatestMarketContextAsync();

            var advice = new Advice
            {
                UserId = userId,
                Theme = theme,
                Status = "Proposed",
                ConsensusText = consensus.ConsensusRecommendation ?? "See individual recommendations below",
                ConservativeRecommendation = consensus.ConservativeAdvice?.RecommendationText,
                AggressiveRecommendation = consensus.AggressiveAdvice?.RecommendationText,
                ConfidenceScore = (int)((consensus.ConservativeAdvice?.ConfidenceScore ?? 0.6m) * 100),
                HasConsensus = consensus.HasConsensus,
                AgreementScore = consensus.AgreementScore,
                AIGenerationCost = consensus.TotalCost,
                TotalTokensUsed = consensus.TotalTokens,
                MarketContextId = marketContext?.MarketContextId,
                ModelsUsed = JsonSerializer.Serialize(new[] { consensus.ConservativeAdvice?.ModelVersion, consensus.AggressiveAdvice?.ModelVersion }),
                SourceAlertId = sourceAlertId,
                GenerationMethod = "AI",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Advice.Add(advice);
            await _context.SaveChangesAsync();

            return advice;
        }

        private AlertCategory MapCategoryToAlertCategory(string category)
        {
            return category switch
            {
                "CashOptimization" => AlertCategory.Portfolio,
                "Rebalancing" => AlertCategory.Rebalancing,
                "TSP" => AlertCategory.Goal,
                "Risk" => AlertCategory.Portfolio,
                _ => AlertCategory.Portfolio
            };
        }

        private string BuildAnalysisSummary(AIAnalysisResult result)
        {
            return $"Analyzed {result.DetailedFindings.Count} areas, generated {result.AlertsGenerated.Count} alerts and {result.AdviceGenerated.Count} advice items. Cost: ${result.TotalCost:F4}, Duration: {result.Duration.TotalSeconds:F1}s";
        }
    }
}
