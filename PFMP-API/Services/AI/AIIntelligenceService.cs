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
        private const int SAME_ALERT_COOLDOWN_DAYS = 7;
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
                // Run specific analyses sequentially to avoid DbContext threading issues
                // TODO: Optimize with IDbContextFactory for parallel execution
                var cashResult = await AnalyzeCashOptimizationAsync(userId);
                var rebalanceResult = await AnalyzePortfolioRebalancingAsync(userId);
                var tspResult = await AnalyzeTSPAllocationAsync(userId);
                var riskResult = await AnalyzeRiskAlignmentAsync(userId);

                // Collect results
                result.DetailedFindings["CashOptimization"] = cashResult;
                result.DetailedFindings["Rebalancing"] = rebalanceResult;
                result.DetailedFindings["TSP"] = tspResult;
                result.DetailedFindings["Risk"] = riskResult;

                // Generate alerts and advice based on findings
                foreach (var finding in result.DetailedFindings)
                {
                    var consensus = finding.Value;
                    
                    // Track costs
                    result.TotalTokens += consensus.TotalTokens;
                    result.TotalCost += consensus.TotalCost;

                    // Generate alert if warranted (checks dedup)
                    if (!forceAnalysis && ShouldGenerateAlert(consensus, userId)
                        && !await HasRecentActiveAlertAsync(userId, finding.Key))
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

        // ===== System Prompt =====

        private const string SYSTEM_PROMPT = @"You are a Certified Financial Planner (CFP) AI operating within PFMP (Personal Financial Management Platform), an automated financial intelligence system.

SYSTEM ARCHITECTURE:
This platform uses a Dual-AI verification system. You are the PRIMARY analyst. Your response will be independently reviewed by a VERIFIER AI that has access to the same raw financial data. The verifier will fact-check your interpretation of the data, validate your logic, and flag any errors or oversights. Do not fabricate numbers or assume data that is not provided — the verifier will catch discrepancies.

WHO IS ASKING:
This request is generated by application logic on behalf of a user, not by the user directly. The user's complete financial profile is provided below. Sections marked 'None' confirm the user has no data in that category — do not assume omitted data exists elsewhere.

YOUR ROLE:
- Analyze the user's complete financial picture using the data provided
- Identify problems, inefficiencies, risks, and missed opportunities
- Provide specific, actionable recommendations with dollar amounts, percentages, and timelines
- When recommending financial products, include real institution names, current approximate rates, and account types
- Prioritize recommendations by estimated financial impact
- Be direct and concise — this output is consumed programmatically, not read conversationally

RESPONSE FORMAT:
You MUST structure your response using EXACTLY these sections. Each section will be parsed by the application to generate user-facing recommendations, alerts, and action items.

## CRITICAL_ALERTS
Urgent issues requiring immediate attention (e.g., inadequate insurance, overdue debts, emergency fund shortfall, significant portfolio risk). If none, write 'None identified.'
Format each as: **[ALERT_TYPE]**: Description with specific numbers.

## RECOMMENDATIONS
Prioritized list of specific actions the user should take. Number each recommendation.
Format each as:
1. **[Category]** Title — Description with specific dollar amounts, percentages, institutions, and timelines. Estimated impact: $X/year or X% improvement.

Categories: CASH, INVESTMENT, TSP, PROPERTY, TAX, INSURANCE, DEBT, INCOME, RETIREMENT, RISK

## PORTFOLIO_HEALTH
Brief assessment of overall portfolio composition, diversification, and alignment with stated risk tolerance and goals. Include:
- Asset allocation breakdown (% in equities, bonds, cash, real estate, retirement)
- Risk alignment score vs stated tolerance
- Diversification assessment

## GOAL_PROGRESS
Progress toward each stated financial goal with projected timeline at current trajectory.
Format: Goal — Current progress — On track / Behind / Ahead — What needs to change (if anything)

## NET_WORTH_SNAPSHOT
Quick summary: Total Assets, Total Liabilities, Net Worth, Monthly Cash Flow (income minus known expenses).

IMPORTANT:
- Every dollar amount must be traceable to the data provided
- Do not invent account balances, rates, or holdings not present in the data
- If data is insufficient for a specific analysis, say so explicitly rather than guessing
- Keep the total response under 3000 words";

        // ===== Specific Area Analysis =====

        public async Task<ConsensusResult> AnalyzeCashOptimizationAsync(int userId)
        {
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var analysisContext = await BuildCashContextAsync(userId);
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = SYSTEM_PROMPT,
                CacheableContext = cacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: CASH OPTIMIZATION ===\n\n{analysisContext}",
                MaxTokens = 4000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzePortfolioRebalancingAsync(int userId)
        {
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var analysisContext = await BuildPortfolioContextAsync(userId);
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = SYSTEM_PROMPT,
                CacheableContext = cacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: PORTFOLIO REBALANCING ===\n\n{analysisContext}",
                MaxTokens = 4000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzeTSPAllocationAsync(int userId)
        {
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var analysisContext = await BuildTSPContextAsync(userId);
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = SYSTEM_PROMPT,
                CacheableContext = cacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: TSP ALLOCATION ===\n\n{analysisContext}",
                MaxTokens = 4000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzeRiskAlignmentAsync(int userId)
        {
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var analysisContext = await BuildRiskContextAsync(userId);
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = SYSTEM_PROMPT,
                CacheableContext = cacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: RISK ALIGNMENT ===\n\n{analysisContext}",
                MaxTokens = 4000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        public async Task<ConsensusResult> AnalyzeFullFinancialAsync(int userId)
        {
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var analysisContext = await BuildFullAnalysisContextAsync(userId);
            
            var prompt = new AIPromptRequest
            {
                SystemPrompt = SYSTEM_PROMPT,
                CacheableContext = cacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: COMPREHENSIVE FINANCIAL REVIEW ===\n\n{analysisContext}",
                MaxTokens = 6000,
                Temperature = 0.3m
            };

            return await _dualAI.GetConsensusRecommendationAsync(prompt);
        }

        // ===== Preview/Dry-Run =====

        public async Task<AIPromptPreview> PreviewAnalysisPromptAsync(int userId, string analysisType)
        {
            _logger.LogInformation("Generating prompt preview for user {UserId}, type {AnalysisType}", userId, analysisType);

            var cacheableContext = await BuildCacheableContextAsync(userId);
            string analysisContext;
            string systemPrompt;

            switch (analysisType.ToLower())
            {
                case "cash":
                case "cashoptimization":
                    analysisContext = await BuildCashContextAsync(userId);
                    break;
                case "portfolio":
                case "rebalancing":
                    analysisContext = await BuildPortfolioContextAsync(userId);
                    break;
                case "tsp":
                    analysisContext = await BuildTSPContextAsync(userId);
                    break;
                case "risk":
                    analysisContext = await BuildRiskContextAsync(userId);
                    break;
                case "full":
                case "comprehensive":
                    analysisContext = await BuildFullAnalysisContextAsync(userId);
                    break;
                default:
                    throw new ArgumentException($"Unknown analysis type: {analysisType}. Valid types: cash, portfolio, tsp, risk, full");
            }
            systemPrompt = SYSTEM_PROMPT;

            var scopeLabel = analysisType.ToLower() == "full" || analysisType.ToLower() == "comprehensive"
                ? "COMPREHENSIVE FINANCIAL REVIEW"
                : $"{analysisType.ToUpper()} ANALYSIS";
            var fullPrompt = $"{systemPrompt}\n\n{cacheableContext.TrimEnd()}\n\n=== ANALYSIS SCOPE: {scopeLabel} ===\n\n{analysisContext}";

            // Rough token estimate (1 token ≈ 4 characters)
            var estimatedTokens = fullPrompt.Length / 4;

            // Gather metadata about what data was included
            var user = await _context.Users.FindAsync(userId);
            var cashAccountCount = await _context.CashAccounts.Where(c => c.UserId == userId).CountAsync();
            var investmentAccountCount = await _context.InvestmentAccounts.Where(i => i.UserId == userId).CountAsync();
            var accountCount = await _context.Accounts.Where(a => a.UserId == userId).CountAsync();
            var holdingCount = await _context.Holdings
                .Where(h => _context.Accounts.Where(a => a.UserId == userId).Select(a => a.AccountId).Contains(h.AccountId))
                .CountAsync();
            var propertyCount = await _context.Properties.Where(p => p.UserId == userId).CountAsync();
            var liabilityCount = await _context.LiabilityAccounts.Where(l => l.UserId == userId).CountAsync();
            var incomeSourceCount = await _context.IncomeStreams.Where(i => i.UserId == userId && i.IsActive).CountAsync();
            var hasTsp = await _context.TspProfiles.AnyAsync(t => t.UserId == userId && !t.IsOptedOut);
            var hasExpenseBudget = await _context.ExpenseBudgets.AnyAsync(e => e.UserId == userId);
            var hasTaxProfile = await _context.TaxProfiles.AnyAsync(t => t.UserId == userId);
            var insurancePolicyCount = await _context.FinancialProfileInsurancePolicies.Where(i => i.UserId == userId).CountAsync();
            var obligationCount = await _context.LongTermObligations.Where(o => o.UserId == userId).CountAsync();

            return new AIPromptPreview
            {
                UserId = userId,
                AnalysisType = analysisType,
                SystemPrompt = systemPrompt,
                CacheableContext = cacheableContext,
                AnalysisContext = analysisContext,
                FullPrompt = fullPrompt,
                EstimatedTokens = estimatedTokens,
                ContextMetadata = new Dictionary<string, object>
                {
                    ["cashAccounts"] = cashAccountCount,
                    ["investmentAccounts"] = investmentAccountCount,
                    ["linkedAccounts"] = accountCount,
                    ["totalHoldings"] = holdingCount,
                    ["properties"] = propertyCount,
                    ["liabilities"] = liabilityCount,
                    ["incomeSources"] = incomeSourceCount,
                    ["hasTsp"] = hasTsp,
                    ["hasExpenseBudget"] = hasExpenseBudget,
                    ["hasTaxProfile"] = hasTaxProfile,
                    ["insurancePolicies"] = insurancePolicyCount,
                    ["longTermObligations"] = obligationCount,
                    ["hasRiskTolerance"] = user?.RiskTolerance != null,
                    ["hasRetirementGoal"] = user?.RetirementGoalAmount != null,
                    ["hasEmergencyFundTarget"] = user?.EmergencyFundTarget > 0
                }
            };
        }

        // ===== Alert-to-Advice Conversion =====

        public async Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId)
        {
            var alert = await _context.Alerts
                .Include(a => a.MarketContext)
                .FirstOrDefaultAsync(a => a.AlertId == alertId && a.UserId == userId)
                ?? throw new InvalidOperationException($"Alert {alertId} not found for user {userId}");

            _logger.LogInformation("Generating advice from alert {AlertId} for user {UserId}", alertId, userId);

            // Build context with cacheable profile and specific alert details
            var cacheableContext = await BuildCacheableContextAsync(userId);
            var alertDetails = $@"
=== ALERT REQUIRING ACTION ===

Alert: {alert.Title}
Message: {alert.Message}
Severity: {alert.Severity}
Category: {alert.Category}
Portfolio Impact: {alert.PortfolioImpactScore}/100

Provide specific, actionable advice to address this alert.";

            var prompt = new AIPromptRequest
            {
                SystemPrompt = @"You are a financial advisor AI within a dual-AI financial management application. This request is generated by application logic in response to a portfolio alert, not a human user.

IMPORTANT: Provide structured, concise recommendations optimized for programmatic consumption. Focus on specific actionable steps.

Format your response as:
- Alert Summary: What triggered this alert (1 sentence)
- Impact Assessment: Specific dollar amounts or percentages affected
- Recommended Actions: Prioritized list with concrete steps
- Timeline: When to act (immediate, this week, this month)
- Monitoring: What metrics to watch

Your analysis will be reviewed by a backup AI system for validation.",
                CacheableContext = cacheableContext,  // Will be cached by Claude
                UserPrompt = alertDetails,
                MaxTokens = 4000,
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
                MaxTokens = 1000,
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

        /// <summary>
        /// Checks for existing active (non-dismissed) alerts in the same category
        /// within the cooldown window to prevent duplicate alerts.
        /// </summary>
        private async Task<bool> HasRecentActiveAlertAsync(int userId, string findingKey)
        {
            var alertCategory = MapCategoryToAlertCategory(findingKey);
            var hasRecent = await _context.Alerts
                .Where(a => a.UserId == userId &&
                           a.Category == alertCategory &&
                           !a.IsDismissed &&
                           a.CreatedAt >= DateTime.UtcNow.AddDays(-SAME_ALERT_COOLDOWN_DAYS))
                .AnyAsync();

            if (hasRecent)
            {
                _logger.LogInformation("Dedup: Active {Category} alert exists for user {UserId} within {Days}-day window",
                    findingKey, userId, SAME_ALERT_COOLDOWN_DAYS);
            }

            return hasRecent;
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

        /// <summary>
        /// Builds the comprehensive financial context sent to AI for every analysis.
        /// Includes ALL financial data the user has entered — cash, investments, holdings,
        /// properties, liabilities, TSP, income, expenses, tax, insurance, obligations.
        /// Privacy: NEVER sends account numbers, SSNs, routing numbers, Plaid tokens, or names.
        /// </summary>
        public async Task<string> BuildFullFinancialContextAsync(int userId)
        {
            var sb = new StringBuilder();

            // === USER PROFILE ===
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                sb.AppendLine("=== USER PROFILE ===");
                var profileParts = new List<string>();
                int age = user.DateOfBirth != null
                    ? (int)((DateTime.UtcNow - user.DateOfBirth.Value).TotalDays / 365.25)
                    : 0;
                if (age > 0) profileParts.Add($"Age: {age}");
                if (!string.IsNullOrEmpty(user.MaritalStatus)) profileParts.Add($"Marital Status: {user.MaritalStatus}");
                if (user.DependentCount > 0) profileParts.Add($"Dependents: {user.DependentCount}");
                if (profileParts.Any()) sb.AppendLine(string.Join(" | ", profileParts));
                if (user.IsGovernmentEmployee)
                {
                    sb.Append("Gov Employee: Yes");
                    if (!string.IsNullOrEmpty(user.GovernmentAgency)) sb.Append($" ({user.GovernmentAgency}");
                    if (!string.IsNullOrEmpty(user.PayGrade)) sb.Append($", {user.PayGrade}");
                    if (!string.IsNullOrEmpty(user.GovernmentAgency)) sb.Append(")");
                    sb.AppendLine();
                    if (!string.IsNullOrEmpty(user.RetirementSystem)) sb.AppendLine($"Retirement System: {user.RetirementSystem}");
                    if (user.ServiceComputationDate.HasValue)
                    {
                        var yearsOfService = (DateTime.UtcNow - user.ServiceComputationDate.Value).TotalDays / 365.25;
                        sb.AppendLine($"Service Computation Date: {user.ServiceComputationDate.Value:yyyy-MM-dd} | Years of Service: {yearsOfService:F1}");
                    }
                }
                sb.AppendLine($"Risk Tolerance: {user.RiskTolerance}/10");
                if (user.VADisabilityPercentage.HasValue && user.VADisabilityPercentage > 0)
                {
                    sb.Append($"VA Disability: {user.VADisabilityPercentage}%");
                    if (user.VADisabilityMonthlyAmount.HasValue)
                        sb.Append($" (${user.VADisabilityMonthlyAmount:N0}/mo, tax-free)");
                    sb.AppendLine();
                }
                sb.AppendLine();
            }

            // === FINANCIAL GOALS ===
            if (user != null && (user.RetirementGoalAmount.HasValue || user.TargetMonthlyPassiveIncome.HasValue || user.EmergencyFundTarget > 0))
            {
                sb.AppendLine("=== FINANCIAL GOALS ===");
                if (user.RetirementGoalAmount.HasValue)
                {
                    sb.Append($"Retirement Target: ${user.RetirementGoalAmount:N0}");
                    if (user.TargetRetirementDate.HasValue)
                    {
                        var yearsTo = user.TargetRetirementDate.Value.Year - DateTime.UtcNow.Year;
                        sb.Append($" by {user.TargetRetirementDate.Value:yyyy} ({yearsTo} years)");
                    }
                    sb.AppendLine();
                }
                if (user.TargetMonthlyPassiveIncome.HasValue)
                    sb.AppendLine($"Target Monthly Passive Income: ${user.TargetMonthlyPassiveIncome:N0}");
                if (user.EmergencyFundTarget > 0)
                    sb.AppendLine($"Emergency Fund Target: ${user.EmergencyFundTarget:N0}");
                sb.AppendLine();
            }

            // === CASH ACCOUNTS ===
            var cashAccounts = await _context.CashAccounts
                .Where(c => c.UserId == userId)
                .ToListAsync();
            if (cashAccounts.Any())
            {
                var totalCash = cashAccounts.Sum(c => c.Balance);
                sb.AppendLine($"=== CASH ACCOUNTS ({cashAccounts.Count} accounts, ${totalCash:N0} total) ===");
                foreach (var ca in cashAccounts)
                {
                    var apr = ca.InterestRateApr.HasValue ? $"{ca.InterestRateApr:F2}% APY" : "N/A APY";
                    var efTag = ca.IsEmergencyFund ? " [EMERGENCY FUND]" : "";
                    var purpose = !string.IsNullOrEmpty(ca.Purpose) ? $" | Purpose: {ca.Purpose}" : "";
                    sb.AppendLine($"• {ca.Nickname} | {ca.AccountType} | {apr} | ${ca.Balance:N0}{efTag}{purpose}");
                }
                if (user?.TransactionalAccountDesiredBalance.HasValue == true)
                    sb.AppendLine($"Desired Checking Balance: ${user.TransactionalAccountDesiredBalance:N0}");
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== CASH ACCOUNTS ===");
                sb.AppendLine("None — no cash or bank accounts on file.");
                sb.AppendLine();
            }

            // === INVESTMENT ACCOUNTS + HOLDINGS ===
            var investmentAccounts = await _context.InvestmentAccounts
                .Where(i => i.UserId == userId)
                .ToListAsync();
            var accounts = await _context.Accounts
                .Where(a => a.UserId == userId)
                .ToListAsync();
            var allHoldings = await _context.Holdings
                .Where(h => accounts.Select(a => a.AccountId).Contains(h.AccountId))
                .ToListAsync();

            bool IsCashAccount(Account a) => a.AccountType == AccountType.Checking || a.AccountType == AccountType.Savings || a.AccountType == AccountType.MoneyMarket || a.AccountType == AccountType.CertificateOfDeposit;

            var nonCashAccounts = accounts.Where(a => !IsCashAccount(a)).ToList();
            if (investmentAccounts.Any() || nonCashAccounts.Any())
            {
                // Compute total including holdings value + cash balance for each account
                var investmentTotal = investmentAccounts.Sum(i => i.CurrentValue);
                foreach (var acct in nonCashAccounts)
                {
                    var acctHoldingsValue = allHoldings.Where(h => h.AccountId == acct.AccountId).Sum(h => h.CurrentValue);
                    investmentTotal += acctHoldingsValue + acct.CurrentBalance;
                }
                sb.AppendLine($"=== INVESTMENT ACCOUNTS ({investmentAccounts.Count + nonCashAccounts.Count} accounts, ${investmentTotal:N0} total) ===");

                foreach (var inv in investmentAccounts)
                {
                    var taxAdv = inv.IsTaxAdvantaged ? "Tax-Advantaged" : "Taxable";
                    sb.AppendLine($"• {inv.AccountName} | {inv.Institution} | {inv.AccountCategory} | {taxAdv} | ${inv.CurrentValue:N0}");
                }

                foreach (var acct in nonCashAccounts)
                {
                    var acctHoldings = allHoldings.Where(h => h.AccountId == acct.AccountId).ToList();
                    var holdingsValue = acctHoldings.Sum(h => h.CurrentValue);
                    var totalAccountValue = holdingsValue + acct.CurrentBalance;
                    var cashNote = acct.CurrentBalance > 0 ? $" (Cash: ${acct.CurrentBalance:N0})" : "";
                    sb.AppendLine($"• {acct.AccountName} | {acct.Institution} | {acct.AccountType} | ${totalAccountValue:N0}{cashNote}");
                    if (!string.IsNullOrWhiteSpace(acct.Purpose))
                        sb.AppendLine($"  Purpose: {acct.Purpose}");

                    foreach (var h in acctHoldings)
                    {
                        var gainLoss = h.UnrealizedGainLoss;
                        var gainPct = h.UnrealizedGainLossPercentage;
                        var gainStr = gainLoss >= 0 ? $"+{gainPct:F1}%" : $"{gainPct:F1}%";
                        var extras = new List<string>();
                        if (h.AnnualDividendYield.HasValue && h.AnnualDividendYield > 0)
                            extras.Add($"Div: {h.AnnualDividendYield:F2}%");
                        if (h.Beta.HasValue)
                            extras.Add($"Beta: {h.Beta:F2}");
                        var extraStr = extras.Any() ? $" | {string.Join(" | ", extras)}" : "";
                        sb.AppendLine($"  - {h.Symbol} ({h.Name}) | {h.AssetType} | {h.Quantity:F2} shares | Cost: ${h.TotalCostBasis:N0} | Value: ${h.CurrentValue:N0} | {gainStr}{extraStr}");
                        if (!string.IsNullOrWhiteSpace(h.Notes))
                            sb.AppendLine($"    Strategy: {h.Notes}");
                    }
                }
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== INVESTMENT ACCOUNTS ===");
                sb.AppendLine("None — no investment or brokerage accounts on file.");
                sb.AppendLine();
            }

            // === TSP ===
            var tsp = await _context.TspProfiles.FindAsync(userId);
            if (tsp != null && !tsp.IsOptedOut)
            {
                // Load all positions (including zero-value for price reference)
                var allTspPositions = await _context.TspLifecyclePositions
                    .Where(p => p.UserId == userId)
                    .ToListAsync();
                var activeTspPositions = allTspPositions.Where(p => (p.CurrentMarketValue ?? 0) > 0 || p.Units > 0).ToList();

                // Compute total balance from positions if profile total is null/zero
                var totalBalance = tsp.TotalBalance ?? 0;
                var positionsTotal = activeTspPositions.Sum(p => p.CurrentMarketValue ?? (p.Units * p.CurrentPrice ?? 0));
                if (totalBalance == 0 && positionsTotal > 0)
                    totalBalance = positionsTotal;

                sb.AppendLine("=== TSP (Federal Thrift Savings Plan) ===");
                sb.AppendLine($"Balance: ${totalBalance:N0} | Contribution Rate: {tsp.ContributionRatePercent:F1}% | Employer Match: {tsp.EmployerMatchPercent:F1}%");

                // Fund allocation percentages (from profile settings)
                var allocParts = new List<string>();
                if (tsp.GFundPercent > 0) allocParts.Add($"G Fund {tsp.GFundPercent:F0}% (${totalBalance * tsp.GFundPercent / 100:N0})");
                if (tsp.FFundPercent > 0) allocParts.Add($"F Fund {tsp.FFundPercent:F0}% (${totalBalance * tsp.FFundPercent / 100:N0})");
                if (tsp.CFundPercent > 0) allocParts.Add($"C Fund {tsp.CFundPercent:F0}% (${totalBalance * tsp.CFundPercent / 100:N0})");
                if (tsp.SFundPercent > 0) allocParts.Add($"S Fund {tsp.SFundPercent:F0}% (${totalBalance * tsp.SFundPercent / 100:N0})");
                if (tsp.IFundPercent > 0) allocParts.Add($"I Fund {tsp.IFundPercent:F0}% (${totalBalance * tsp.IFundPercent / 100:N0})");
                if (allocParts.Any())
                    sb.AppendLine($"Allocations: {string.Join(" | ", allocParts)}");

                // Individual positions with units, price, value, and mix %
                if (activeTspPositions.Any())
                {
                    sb.AppendLine("Positions:");
                    foreach (var p in activeTspPositions.OrderByDescending(p => p.CurrentMarketValue ?? 0))
                    {
                        var value = p.CurrentMarketValue ?? (p.Units * p.CurrentPrice ?? 0);
                        var mixPct = totalBalance > 0 ? (value / totalBalance * 100) : 0;
                        var priceStr = p.CurrentPrice.HasValue ? $"${p.CurrentPrice:F2}/unit" : "";
                        sb.AppendLine($"  - {p.FundCode} | {p.Units:F2} units | {priceStr} | Value: ${value:N0} | {mixPct:F1}% of TSP");
                    }
                }
                sb.AppendLine();
            }
            else if (user?.IsGovernmentEmployee == true)
            {
                sb.AppendLine("=== TSP (Federal Thrift Savings Plan) ===");
                if (tsp?.IsOptedOut == true)
                    sb.AppendLine("Opted out of TSP.");
                else
                    sb.AppendLine("No TSP data on file.");
                sb.AppendLine();
            }

            // === PROPERTIES ===
            var properties = await _context.Properties
                .Where(p => p.UserId == userId)
                .ToListAsync();
            if (properties.Any())
            {
                var totalValue = properties.Sum(p => p.EstimatedValue);
                var totalEquity = properties.Sum(p => p.EstimatedValue - (p.MortgageBalance ?? 0));
                sb.AppendLine($"=== PROPERTIES ({properties.Count} properties, ${totalValue:N0} total value, ${totalEquity:N0} equity) ===");
                foreach (var prop in properties)
                {
                    sb.AppendLine($"• {prop.PropertyName} | {prop.PropertyType} | {prop.Occupancy} | Value: ${prop.EstimatedValue:N0}");
                    if (prop.MortgageBalance.HasValue && prop.MortgageBalance > 0)
                    {
                        sb.Append($"  Mortgage: ${prop.MortgageBalance:N0}");
                        if (prop.InterestRate.HasValue) sb.Append($" @ {prop.InterestRate:F2}%");
                        if (prop.MortgageTerm.HasValue) sb.Append($" | {prop.MortgageTerm}yr fixed");
                        if (!string.IsNullOrEmpty(prop.Lienholder)) sb.Append($" | Lienholder: {prop.Lienholder}");
                        sb.AppendLine();
                    }
                    if (prop.MonthlyMortgagePayment.HasValue && prop.MonthlyMortgagePayment > 0)
                        sb.Append($"  Payment: ${prop.MonthlyMortgagePayment:N0}/mo");
                    if (prop.MonthlyPropertyTax.HasValue && prop.MonthlyPropertyTax > 0)
                    {
                        var taxAmt = prop.PropertyTaxFrequency == "annual"
                            ? $"${prop.MonthlyPropertyTax:N0}/yr" : $"${prop.MonthlyPropertyTax:N0}/mo";
                        sb.Append($" | Taxes: {taxAmt}");
                    }
                    if (prop.MonthlyInsurance.HasValue && prop.MonthlyInsurance > 0)
                    {
                        var insAmt = prop.InsuranceFrequency == "annual"
                            ? $"${prop.MonthlyInsurance:N0}/yr" : $"${prop.MonthlyInsurance:N0}/mo";
                        sb.Append($" | Insurance: {insAmt}");
                    }
                    var equity = prop.EstimatedValue - (prop.MortgageBalance ?? 0);
                    sb.AppendLine($" | Equity: ${equity:N0}");
                    if (prop.HasHeloc) sb.AppendLine("  HELOC: Yes");
                    if (prop.MonthlyRentalIncome.HasValue && prop.MonthlyRentalIncome > 0)
                    {
                        var netCashFlow = prop.MonthlyRentalIncome.Value
                            - (prop.MonthlyMortgagePayment ?? 0)
                            - (prop.MonthlyExpenses ?? 0);
                        sb.AppendLine($"  Rental Income: ${prop.MonthlyRentalIncome:N0}/mo | Net Cash Flow: ${netCashFlow:N0}/mo");
                    }
                    if (prop.EstimatedPayoffDate.HasValue)
                        sb.AppendLine($"  Est. Payoff: {prop.EstimatedPayoffDate.Value:yyyy-MM}");
                    if (!string.IsNullOrEmpty(prop.Purpose))
                        sb.AppendLine($"  Purpose: {prop.Purpose}");
                }
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== PROPERTIES ===");
                sb.AppendLine("None — no real estate properties on file.");
                sb.AppendLine();
            }

            // === LIABILITIES ===
            var liabilities = await _context.LiabilityAccounts
                .Where(l => l.UserId == userId)
                .ToListAsync();
            if (liabilities.Any())
            {
                var totalLiab = liabilities.Sum(l => l.CurrentBalance);
                sb.AppendLine($"=== LIABILITIES ({liabilities.Count} accounts, ${totalLiab:N0} total) ===");
                foreach (var l in liabilities)
                {
                    sb.Append($"• {l.Lender} | {l.LiabilityType} | ${l.CurrentBalance:N0}");
                    if (l.InterestRateApr.HasValue && l.InterestRateApr > 0)
                        sb.Append($" | {l.InterestRateApr:F2}% APR");
                    sb.AppendLine();
                    if (l.IsOverdue) sb.AppendLine("  ** OVERDUE **");
                }
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== LIABILITIES ===");
                sb.AppendLine("None — no outstanding debts, loans, or credit balances reported.");
                sb.AppendLine();
            }

            // === INCOME SOURCES ===
            var incomeStreams = await _context.IncomeStreams
                .Where(i => i.UserId == userId && i.IsActive)
                .ToListAsync();
            if (incomeStreams.Any())
            {
                var totalMonthly = incomeStreams.Sum(i => i.MonthlyAmount);
                sb.AppendLine($"=== INCOME SOURCES ({incomeStreams.Count} sources, ${totalMonthly:N0}/mo gross) ===");
                foreach (var inc in incomeStreams)
                {
                    var guaranteed = inc.IsGuaranteed ? "Guaranteed" : "Variable";
                    sb.AppendLine($"• {inc.Name} | {inc.IncomeType} | ${inc.MonthlyAmount:N0}/mo | {guaranteed}");
                }
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== INCOME SOURCES ===");
                sb.AppendLine("None — no income sources recorded yet.");
                sb.AppendLine();
            }

            // === EXPENSES ===
            var expenses = await _context.ExpenseBudgets
                .Where(e => e.UserId == userId)
                .ToListAsync();
            if (expenses.Any())
            {
                var totalExpenses = expenses.Sum(e => e.MonthlyAmount);
                sb.AppendLine($"=== EXPENSES (Monthly: ${totalExpenses:N0} estimated) ===");
                foreach (var exp in expenses)
                {
                    sb.Append($"• {exp.Category}: ${exp.MonthlyAmount:N0}");
                    if (exp.IsEstimated) sb.Append(" (est.)");
                    if (!string.IsNullOrEmpty(exp.Notes)) sb.Append($" - {exp.Notes}");
                    sb.AppendLine();
                }
                sb.AppendLine();
            }
            else
            {
                sb.AppendLine("=== EXPENSES ===");
                sb.AppendLine("None — no monthly expense data tracked yet. Cash flow analysis may be limited.");
                sb.AppendLine();
            }

            // === TAX PROFILE ===
            var tax = await _context.TaxProfiles.FindAsync(userId);
            if (tax != null)
            {
                sb.AppendLine("=== TAX PROFILE ===");
                sb.Append($"Filing: {tax.FilingStatus}");
                if (!string.IsNullOrEmpty(tax.StateOfResidence)) sb.Append($" | State: {tax.StateOfResidence}");
                if (tax.MarginalRatePercent > 0) sb.Append($" | Marginal Rate: {tax.MarginalRatePercent:F0}%");
                if (tax.EffectiveRatePercent > 0) sb.Append($" | Effective Rate: {tax.EffectiveRatePercent:F0}%");
                sb.AppendLine();
                sb.AppendLine();
            }

            // === INSURANCE ===
            var insurance = await _context.FinancialProfileInsurancePolicies
                .Where(i => i.UserId == userId)
                .ToListAsync();
            sb.AppendLine("=== INSURANCE ===");
            if (insurance.Any())
            {
                foreach (var pol in insurance)
                {
                    sb.Append($"• {pol.PolicyType}");
                    if (!string.IsNullOrEmpty(pol.Carrier)) sb.Append($" ({pol.Carrier})");
                    if (pol.CoverageAmount > 0) sb.Append($" | Coverage: ${pol.CoverageAmount:N0}");
                    if (pol.PremiumAmount > 0)
                        sb.Append($" | Premium: ${pol.PremiumAmount:N0}/{pol.PremiumFrequency ?? "mo"}");
                    sb.Append(pol.IsAdequateCoverage ? " | Adequate" : " | Needs Review");
                    sb.AppendLine();
                }
            }
            else
            {
                sb.AppendLine("None — no insurance policies on file.");
            }
            sb.AppendLine();

            // === LONG-TERM OBLIGATIONS ===
            var obligations = await _context.LongTermObligations
                .Where(o => o.UserId == userId)
                .ToListAsync();
            sb.AppendLine("=== LONG-TERM OBLIGATIONS ===");
            if (obligations.Any())
            {
                foreach (var ob in obligations)
                {
                    var funded = ob.EstimatedCost > 0
                        ? $"Funded: ${ob.FundsAllocated:N0}/{ob.EstimatedCost:N0} ({ob.FundsAllocated / ob.EstimatedCost * 100:F0}%)"
                        : "";
                    var critical = ob.IsCritical ? " ** CRITICAL **" : "";
                    sb.AppendLine($"• {ob.ObligationName} | {ob.ObligationType} | Target: {ob.TargetDate:yyyy-MM} | {funded}{critical}");
                }
            }
            else
            {
                sb.AppendLine("None — no long-term financial obligations reported.");
            }
            sb.AppendLine();

            return sb.ToString();
        }

        /// <summary>
        /// Legacy: Builds cacheable context for backward compatibility.
        /// Now delegates to BuildFullFinancialContextAsync plus memory/market context.
        /// </summary>
        private async Task<string> BuildCacheableContextAsync(int userId)
        {
            var sb = new StringBuilder();

            // Full financial data
            var financialContext = await BuildFullFinancialContextAsync(userId);
            sb.Append(financialContext.TrimEnd());
            sb.AppendLine();
            sb.AppendLine();

            // Recent action memory
            var memoryContext = await _memory.BuildMemoryContextAsync(userId, includeRecent: true, includePreferences: true);
            sb.AppendLine("=== RECENT ACTIONS & PREFERENCES ===");
            sb.AppendLine(memoryContext.TrimEnd());
            sb.AppendLine();
            sb.AppendLine();

            // Market context summary
            var marketSummary = await _memory.BuildMarketContextSummaryAsync(30);
            sb.AppendLine("=== MARKET CONTEXT ===");
            sb.AppendLine(marketSummary.TrimEnd());
            sb.AppendLine();
            sb.AppendLine();

            // Active alerts & advice — tells AI what's already been recommended
            await AppendActiveAlertsAndAdviceAsync(sb, userId);

            return sb.ToString();
        }

        /// <summary>
        /// Appends a summary of active (non-dismissed) alerts and proposed/accepted advice
        /// so the AI knows what has already been communicated and avoids repetition.
        /// </summary>
        private async Task AppendActiveAlertsAndAdviceAsync(StringBuilder sb, int userId)
        {
            var activeAlerts = await _context.Alerts
                .Where(a => a.UserId == userId && !a.IsDismissed)
                .OrderByDescending(a => a.CreatedAt)
                .Take(20)
                .ToListAsync();

            var activeAdvice = await _context.Advice
                .Where(a => a.UserId == userId && (a.Status == "Proposed" || a.Status == "Accepted"))
                .OrderByDescending(a => a.CreatedAt)
                .Take(20)
                .ToListAsync();

            sb.AppendLine("=== ACTIVE ALERTS & ADVICE (already communicated to user) ===");
            sb.AppendLine("Do NOT repeat these. Provide new insights, follow-ups, or escalations only.");

            if (activeAlerts.Any())
            {
                sb.AppendLine($"Active Alerts ({activeAlerts.Count}):");
                foreach (var a in activeAlerts)
                {
                    var age = (DateTime.UtcNow - a.CreatedAt).Days;
                    var read = a.IsRead ? "read" : "unread";
                    sb.AppendLine($"  - [{a.Category}] {a.Title} ({a.Severity}, {read}, {age}d ago)");
                }
            }
            else
            {
                sb.AppendLine("No active alerts.");
            }

            if (activeAdvice.Any())
            {
                sb.AppendLine($"Active Advice ({activeAdvice.Count}):");
                foreach (var a in activeAdvice)
                {
                    var age = (DateTime.UtcNow - a.CreatedAt).Days;
                    sb.AppendLine($"  - [{a.Theme}] {a.Status} | Confidence: {a.ConfidenceScore}% | {age}d ago");
                    if (!string.IsNullOrWhiteSpace(a.ConsensusText))
                    {
                        var summary = a.ConsensusText.Length > 150
                            ? a.ConsensusText[..150] + "..."
                            : a.ConsensusText;
                        sb.AppendLine($"    Summary: {summary}");
                    }
                }
            }
            else
            {
                sb.AppendLine("No active advice.");
            }

            sb.AppendLine();
        }

        private Task<string> BuildCashContextAsync(int userId)
        {
            var sb = new StringBuilder();
            sb.AppendLine("PRIMARY FOCUS: Cash allocation efficiency.");
            sb.AppendLine("Emphasize: Is cash optimally allocated? Any excess in low-yield accounts? Is emergency fund properly funded?");
            sb.AppendLine("When recommending transfers to higher-yield alternatives, provide specific examples of current accounts/institutions with competitive rates.");
            sb.AppendLine("Still provide the full structured response (CRITICAL_ALERTS, RECOMMENDATIONS, PORTFOLIO_HEALTH, GOAL_PROGRESS, NET_WORTH_SNAPSHOT) covering all areas, but weight cash analysis most heavily.");
            return Task.FromResult(sb.ToString());
        }

        private Task<string> BuildPortfolioContextAsync(int userId)
        {
            var sb = new StringBuilder();
            sb.AppendLine("PRIMARY FOCUS: Portfolio allocation and rebalancing.");
            sb.AppendLine("Emphasize: Is portfolio properly balanced vs risk tolerance? Identify drift, concentration risk, fee drag, tax-loss harvesting opportunities.");
            sb.AppendLine("Still provide the full structured response covering all areas, but weight portfolio/investment analysis most heavily.");
            return Task.FromResult(sb.ToString());
        }

        private Task<string> BuildTSPContextAsync(int userId)
        {
            var sb = new StringBuilder();
            sb.AppendLine("PRIMARY FOCUS: TSP allocation optimization.");
            sb.AppendLine("Emphasize: Is TSP allocation appropriate for age/retirement timeline? Is contribution rate maximizing employer match? Compare to lifecycle fund targets.");
            sb.AppendLine("Still provide the full structured response covering all areas, but weight TSP analysis most heavily.");
            return Task.FromResult(sb.ToString());
        }

        private Task<string> BuildRiskContextAsync(int userId)
        {
            var sb = new StringBuilder();
            sb.AppendLine("PRIMARY FOCUS: Risk tolerance alignment.");
            sb.AppendLine("Emphasize: Does actual portfolio composition match stated risk tolerance? Identify misalignments between risk appetite and asset allocation.");
            sb.AppendLine("Still provide the full structured response covering all areas, but weight risk analysis most heavily.");
            return Task.FromResult(sb.ToString());
        }

        private Task<string> BuildFullAnalysisContextAsync(int userId)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Perform a comprehensive financial review across ALL areas with equal weight:");
            sb.AppendLine("- Cash: Allocation efficiency, emergency fund adequacy, yield optimization");
            sb.AppendLine("- Investments: Portfolio balance, diversification, cost basis, unrealized gains/losses");
            sb.AppendLine("- TSP: Contribution rate, fund allocation, lifecycle alignment, employer match optimization");
            sb.AppendLine("- Property: Equity position, mortgage efficiency, rental cash flow");
            sb.AppendLine("- Risk: Overall risk exposure vs stated tolerance, concentration risks");
            sb.AppendLine("- Tax: Filing optimization, tax-advantaged account utilization, state considerations");
            sb.AppendLine("- Insurance: Coverage adequacy, gaps in protection");
            sb.AppendLine("- Debt: Outstanding liabilities, interest rate optimization, payoff strategy");
            sb.AppendLine("- Income: Diversification, growth potential, passive income progress");
            sb.AppendLine("- Retirement: FERS pension projection, TSP + investment trajectory, target readiness");
            return Task.FromResult(sb.ToString());
        }

        private async Task<string> BuildChatContextAsync(int userId, string message)
        {
            var sb = new StringBuilder();

            // Full financial context
            var financialContext = await BuildFullFinancialContextAsync(userId);
            sb.AppendLine(financialContext);

            // Memory context
            var memoryContext = await _memory.BuildMemoryContextAsync(userId, includeRecent: true, includePreferences: true);
            sb.AppendLine(memoryContext);

            // Brief market context
            var marketSummary = await _memory.BuildMarketContextSummaryAsync(7);
            sb.AppendLine(marketSummary);
            sb.AppendLine();

            // User's question
            sb.AppendLine($"USER QUESTION: {message}");

            return sb.ToString();
        }

        private string BuildChatSystemPrompt()
        {
            return @"You are a knowledgeable financial advisor having a conversation with a client.

Guidelines:
- Be conversational but professional and CONCISE
- Keep responses under 200 words unless complex analysis required
- Use bullet points for action items
- Reference their recent actions and preferences when relevant
- If you notice they just made a financial move, acknowledge it and suggest waiting
- Be specific with numbers and timeframes
- End with a clear, actionable next step

Remember: You have their complete financial picture and memory of past conversations.";
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

            // Extract agreement level from metadata if available
            string? agreementLevel = null;
            if (consensus.Metadata != null && consensus.Metadata.TryGetValue("agreementLevel", out var level))
            {
                agreementLevel = level?.ToString();
            }

            var advice = new Advice
            {
                UserId = userId,
                Theme = theme,
                Status = "Proposed",
                ConsensusText = consensus.ConsensusRecommendation ?? "See individual recommendations below",
                
                // New primary+backup fields (Wave 7.3)
                PrimaryRecommendation = consensus.PrimaryRecommendation?.RecommendationText,
                BackupCorroboration = consensus.BackupCorroboration?.RecommendationText,
                BackupAgreementLevel = agreementLevel,
                
                // Legacy fields (preserve for backward compatibility)
                ConservativeRecommendation = consensus.ConservativeAdvice?.RecommendationText,
                AggressiveRecommendation = consensus.AggressiveAdvice?.RecommendationText,
                
                ConfidenceScore = (int)((consensus.PrimaryRecommendation?.ConfidenceScore ?? consensus.ConservativeAdvice?.ConfidenceScore ?? 0.6m) * 100),
                HasConsensus = consensus.HasConsensus,
                AgreementScore = consensus.AgreementScore,
                AIGenerationCost = consensus.TotalCost,
                TotalTokensUsed = consensus.TotalTokens,
                MarketContextId = marketContext?.MarketContextId,
                ModelsUsed = JsonSerializer.Serialize(new[] { 
                    consensus.PrimaryRecommendation?.ModelVersion ?? consensus.ConservativeAdvice?.ModelVersion, 
                    consensus.BackupCorroboration?.ModelVersion ?? consensus.AggressiveAdvice?.ModelVersion 
                }),
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
