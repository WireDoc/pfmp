using Azure.AI.OpenAI;
using Azure;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using OpenAI.Chat;

namespace PFMP_API.Services
{
    /// <summary>
    /// AI service implementation using Azure OpenAI for financial analysis and recommendations
    /// </summary>
    public class AIService : IAIService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AIService> _logger;
        private readonly AzureOpenAIClient? _openAIClient;
        private readonly ChatClient? _chatClient;
        private readonly IConfiguration _configuration;
        private readonly IMarketDataService _marketDataService;

        public AIService(ApplicationDbContext context, ILogger<AIService> logger, IConfiguration configuration, IMarketDataService marketDataService)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _marketDataService = marketDataService;

            // Initialize Azure OpenAI client
            var endpoint = _configuration["AzureOpenAI:Endpoint"];
            var apiKey = _configuration["AzureOpenAI:ApiKey"];
            var deploymentName = _configuration["AzureOpenAI:DeploymentName"] ?? "gpt-4";

            if (!string.IsNullOrEmpty(endpoint) && !string.IsNullOrEmpty(apiKey))
            {
                _openAIClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
                _chatClient = _openAIClient.GetChatClient(deploymentName);
                _logger.LogInformation("Azure OpenAI client initialized successfully");
            }
            else
            {
                _logger.LogWarning("Azure OpenAI configuration not found. AI features will use fallback logic.");
            }
        }

        public async Task<List<CreateTaskRequest>> GenerateTaskRecommendationsAsync(int userId)
        {
            try
            {
                _logger.LogInformation("Generating task recommendations for user {UserId}", userId);

                // Get user's portfolio data
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found", userId);
                    return new List<CreateTaskRequest>();
                }

                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                var goals = await _context.Goals
                    .Where(g => g.UserId == userId)
                    .ToListAsync();

                // If no OpenAI client, return basic recommendations
                if (_chatClient == null)
                {
                    return GenerateFallbackRecommendations(userId, accounts, goals);
                }

                // Create AI prompt
                var prompt = BuildPortfolioAnalysisPrompt(user, accounts, goals);
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a professional financial advisor. Analyze the portfolio data and generate specific, actionable task recommendations. Return your response as a JSON array of tasks."),
                    new UserChatMessage(prompt)
                };

                var response = await _chatClient.CompleteChatAsync(messages);
                var content = response.Value.Content[0].Text;

                // Parse AI response and convert to CreateTaskRequest objects
                return ParseAITaskRecommendations(content, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating task recommendations for user {UserId}", userId);
                return new List<CreateTaskRequest>();
            }
        }

        public async Task<TaskPriority> RecommendTaskPriorityAsync(CreateTaskRequest task)
        {
            try
            {
                if (_chatClient == null)
                {
                    // Fallback priority logic
                    return task.Type switch
                    {
                        TaskType.EmergencyFundContribution => TaskPriority.Critical,
                        TaskType.TaxLossHarvesting => TaskPriority.High,
                        TaskType.Rebalancing => TaskPriority.Medium,
                        TaskType.StockPurchase => TaskPriority.Medium,
                        _ => TaskPriority.Low
                    };
                }

                var prompt = $"Analyze this financial task and recommend priority level (Critical/High/Medium/Low):\nTitle: {task.Title}\nDescription: {task.Description}\nType: {task.Type}";
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a financial advisor. Analyze the task and return only the priority level: Critical, High, Medium, or Low."),
                    new UserChatMessage(prompt)
                };

                var response = await _chatClient.CompleteChatAsync(messages);
                var priorityText = response.Value.Content[0].Text.Trim();

                return priorityText.ToUpper() switch
                {
                    "CRITICAL" => TaskPriority.Critical,
                    "HIGH" => TaskPriority.High,
                    "MEDIUM" => TaskPriority.Medium,
                    "LOW" => TaskPriority.Low,
                    _ => TaskPriority.Medium
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recommending task priority");
                return TaskPriority.Medium;
            }
        }

        public async Task<TaskType> CategorizeTaskAsync(string title, string description)
        {
            try
            {
                if (_chatClient == null)
                {
                    // Simple keyword-based categorization
                    var text = $"{title} {description}".ToLower();
                    if (text.Contains("rebalanc")) return TaskType.Rebalancing;
                    if (text.Contains("emergency") || text.Contains("fund")) return TaskType.EmergencyFundContribution;
                    if (text.Contains("tax") || text.Contains("harvest")) return TaskType.TaxLossHarvesting;
                    if (text.Contains("buy") || text.Contains("purchase")) return TaskType.StockPurchase;
                    if (text.Contains("tsp")) return TaskType.TSPAllocationChange;
                    return TaskType.Rebalancing;
                }

                var prompt = $"Categorize this financial task. Return only the category number:\n1=Rebalancing, 2=StockPurchase, 3=TaxLossHarvesting, 4=CashOptimization, 5=GoalAdjustment, 6=InsuranceReview, 7=EmergencyFundContribution, 8=TSPAllocationChange\n\nTitle: {title}\nDescription: {description}";
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a financial advisor. Categorize the task and return only a number 1-8."),
                    new UserChatMessage(prompt)
                };

                var response = await _chatClient.CompleteChatAsync(messages);
                var categoryText = response.Value.Content[0].Text.Trim();

                return int.TryParse(categoryText, out int category) && category >= 1 && category <= 8
                    ? (TaskType)category
                    : TaskType.Rebalancing;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error categorizing task");
                return TaskType.Rebalancing;
            }
        }

        public async Task<string> AnalyzePortfolioAsync(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                // Get current market data for enhanced analysis
                var marketIndices = await _marketDataService.GetMarketIndicesAsync();
                var economicIndicators = await _marketDataService.GetEconomicIndicatorsAsync();
                
                // Get TSP fund prices if user has TSP accounts
                Dictionary<string, MarketPrice>? tspFunds = null;
                var hasTSPAccounts = accounts.Any(a => a.AccountType == AccountType.TSP);
                if (hasTSPAccounts)
                {
                    tspFunds = await _marketDataService.GetTSPFundPricesAsync();
                }

                if (_chatClient == null)
                {
                    return GenerateFallbackAnalysisWithMarketData(accounts, marketIndices, economicIndicators, tspFunds);
                }

                var prompt = BuildMarketAwarePortfolioPrompt(user, accounts, null, marketIndices, economicIndicators, tspFunds);
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a financial advisor with real-time market data. Provide comprehensive portfolio analysis incorporating current market conditions, economic indicators, and actionable recommendations based on market trends."),
                    new UserChatMessage(prompt)
                };

                var response = await _chatClient.CompleteChatAsync(messages);
                return response.Value.Content[0].Text;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing portfolio for user {UserId}", userId);
                return "Unable to generate portfolio analysis at this time.";
            }
        }

        public async Task<List<Alert>> GenerateMarketAlertsAsync(int userId)
        {
            try
            {
                var alerts = new List<Alert>();
                var user = await _context.Users.FindAsync(userId);
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                if (user == null || !accounts.Any())
                    return alerts;

                // Get current market data
                var marketIndices = await _marketDataService.GetMarketIndicesAsync();
                var economicIndicators = await _marketDataService.GetEconomicIndicatorsAsync();

                // High volatility alert
                if (marketIndices.VIX.Price > 30)
                {
                    alerts.Add(new Alert
                    {
                        UserId = userId,
                        Category = AlertCategory.Portfolio,
                        Title = "High Market Volatility Detected",
                        Message = $"VIX is currently at {marketIndices.VIX.Price:F2}, indicating elevated market fear. Consider reviewing your portfolio allocation and avoiding major changes during this period.",
                        Severity = AlertSeverity.High,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else if (marketIndices.VIX.Price < 12)
                {
                    alerts.Add(new Alert
                    {
                        UserId = userId,
                        Category = AlertCategory.Rebalancing,
                        Title = "Low Volatility - Rebalancing Opportunity",
                        Message = $"VIX is low at {marketIndices.VIX.Price:F2}, indicating market complacency. This may be a good time to rebalance or take profits.",
                        Severity = AlertSeverity.Medium,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Interest rate alerts
                if (economicIndicators.TreasuryYield10Year > 5.0m)
                {
                    alerts.Add(new Alert
                    {
                        UserId = userId,
                        Category = AlertCategory.Portfolio,
                        Title = "High Bond Yields Available",
                        Message = $"10-year Treasury yields are at {economicIndicators.TreasuryYield10Year:F2}%, offering attractive fixed-income opportunities. Consider increasing bond allocation.",
                        Severity = AlertSeverity.Medium,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Market performance alerts
                var majorIndicesDown = new[] { marketIndices.SP500, marketIndices.NASDAQ, marketIndices.DowJones }
                    .Count(idx => idx.ChangePercent < -2.0m);

                if (majorIndicesDown >= 2)
                {
                    alerts.Add(new Alert
                    {
                        UserId = userId,
                        Category = AlertCategory.Portfolio,
                        Title = "Broad Market Decline",
                        Message = $"Multiple major indices are down over 2% today. Stay disciplined with your long-term investment strategy and avoid emotional decisions.",
                        Severity = AlertSeverity.Medium,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // TSP-specific alerts for government employees
                var hasTSPAccounts = accounts.Any(a => a.AccountType == AccountType.TSP);
                if (hasTSPAccounts && (user.EmploymentType?.Contains("Federal") == true || user.EmploymentType?.Contains("Military") == true))
                {
                    var tspFunds = await _marketDataService.GetTSPFundPricesAsync();
                    var cFundPerformance = tspFunds.GetValueOrDefault("C_FUND")?.ChangePercent ?? 0;
                    
                    if (Math.Abs(cFundPerformance) > 3.0m)
                    {
                        var direction = cFundPerformance > 0 ? "up" : "down";
                        alerts.Add(new Alert
                        {
                            UserId = userId,
                            Category = AlertCategory.Portfolio,
                            Title = $"TSP C Fund Significant Movement",
                            Message = $"TSP C Fund is {direction} {Math.Abs(cFundPerformance):F1}% today. Review your TSP allocation and contribution strategy.",
                            Severity = AlertSeverity.Medium,
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                // Age-based alerts
                if (user.DateOfBirth.HasValue)
                {
                    var age = DateTime.UtcNow.Year - user.DateOfBirth.Value.Year;
                    if (user.DateOfBirth.Value.Date > DateTime.UtcNow.AddYears(-age).Date)
                        age--;

                    // Near retirement alerts during market stress
                    if (age >= 55 && marketIndices.VIX.Price > 25)
                    {
                        alerts.Add(new Alert
                        {
                            UserId = userId,
                            Category = AlertCategory.Portfolio,
                            Title = "Pre-Retirement Market Stress Review",
                            Message = "With elevated market volatility and your proximity to retirement, consider reviewing your asset allocation to ensure appropriate risk management.",
                            Severity = AlertSeverity.High,
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                return alerts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating market alerts for user {UserId}", userId);
                return new List<Alert>();
            }
        }

        public async Task<string> ExplainRecommendationAsync(string recommendation)
        {
            try
            {
                if (_chatClient == null)
                {
                    return $"Recommendation: {recommendation}\n\nThis recommendation is based on standard financial planning principles and portfolio optimization strategies.";
                }

                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a financial advisor. Explain the reasoning behind this recommendation in simple, clear terms."),
                    new UserChatMessage($"Explain why this recommendation is important: {recommendation}")
                };

                var response = await _chatClient.CompleteChatAsync(messages);
                return response.Value.Content[0].Text;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error explaining recommendation");
                return "Unable to provide explanation at this time.";
            }
        }

        private List<CreateTaskRequest> GenerateFallbackRecommendations(int userId, List<Account> accounts, List<Goal> goals)
        {
            var recommendations = new List<CreateTaskRequest>();

            // Get user demographics for enhanced recommendations
            var user = _context.Users.Find(userId);
            
            // Calculate age for age-specific recommendations
            int? age = null;
            if (user?.DateOfBirth.HasValue == true)
            {
                var today = DateTime.UtcNow;
                age = today.Year - user.DateOfBirth.Value.Year;
                if (user.DateOfBirth.Value.Date > today.AddYears(-age.Value).Date)
                    age--;
            }

            var totalBalance = accounts.Sum(a => a.CurrentBalance);
            
            // Age-based investment recommendations
            if (age.HasValue && totalBalance > 5000)
            {
                if (age < 30)
                {
                    recommendations.Add(new CreateTaskRequest
                    {
                        UserId = userId,
                        Type = TaskType.TSPAllocationChange,
                        Title = "Maximize Aggressive Growth Investments",
                        Description = $"At age {age}, prioritize high-growth investments like C Fund and S Fund in TSP. Consider 80-90% stocks for long-term wealth building.",
                        Priority = TaskPriority.High
                    });
                }
                else if (age < 45)
                {
                    recommendations.Add(new CreateTaskRequest
                    {
                        UserId = userId,
                        Type = TaskType.TSPAllocationChange,
                        Title = "Balanced Growth Strategy",
                        Description = $"At age {age}, balance growth with stability. Consider 70-80% stocks with some bond allocation for risk management.",
                        Priority = TaskPriority.Medium
                    });
                }
                else
                {
                    recommendations.Add(new CreateTaskRequest
                    {
                        UserId = userId,
                        Type = TaskType.TSPAllocationChange,
                        Title = "Pre-Retirement Asset Allocation",
                        Description = $"At age {age}, focus on capital preservation. Consider 50-60% stocks with increased bond allocation and income-generating investments.",
                        Priority = TaskPriority.High
                    });
                }
            }

            // TSP-specific recommendations for government employees
            if (user?.IsGovernmentEmployee == true)
            {
                var tspAccount = accounts.FirstOrDefault(a => a.AccountType.ToString().Contains("TSP"));
                if (tspAccount != null && user.AnnualIncome.HasValue)
                {
                    var maxTSPContribution = user.AnnualIncome.Value * 0.05m; // 5% for full match
                    var currentMonthlyTSP = tspAccount.TSPMonthlyContribution ?? 0;
                    var currentAnnualTSP = currentMonthlyTSP * 12;

                    if (currentAnnualTSP < maxTSPContribution)
                    {
                        recommendations.Add(new CreateTaskRequest
                        {
                            UserId = userId,
                            Type = TaskType.TSPAllocationChange,
                            Title = "Maximize TSP Employer Match",
                            Description = $"Increase TSP contribution to at least 5% (${maxTSPContribution:N0}/year) to get full employer match. Currently contributing ${currentAnnualTSP:N0}/year.",
                            Priority = TaskPriority.High
                        });
                    }
                }
            }

            // VA Disability optimization
            if (user?.VADisabilityPercentage > 0 && user?.VADisabilityMonthlyAmount > 0)
            {
                recommendations.Add(new CreateTaskRequest
                {
                    UserId = userId,
                    Type = TaskType.TaxLossHarvesting,
                    Title = "Leverage Tax-Free VA Disability Income",
                    Description = $"Your ${user.VADisabilityMonthlyAmount:N0}/month VA disability income is tax-free. Consider higher-risk investments in taxable accounts since you have stable tax-free income.",
                    Priority = TaskPriority.Medium
                });
            }

            // Portfolio rebalancing (enhanced with demographics)
            if (totalBalance > 10000)
            {
                recommendations.Add(new CreateTaskRequest
                {
                    UserId = userId,
                    Type = TaskType.Rebalancing,
                    Title = "Portfolio Rebalancing Review",
                    Description = age.HasValue 
                        ? $"Review and rebalance portfolio for age {age} optimal allocation. Consider your {user?.RiskTolerance ?? 5}/10 risk tolerance."
                        : "Review and rebalance your portfolio allocation to maintain optimal risk/return profile.",
                    Priority = TaskPriority.Medium
                });
            }

            // Emergency fund (enhanced with income data)
            var emergencyFund = accounts.FirstOrDefault(a => a.IsEmergencyFund);
            var emergencyTarget = user?.EmergencyFundTarget ?? 5000m;
            if (emergencyFund == null || emergencyFund.CurrentBalance < emergencyTarget)
            {
                recommendations.Add(new CreateTaskRequest
                {
                    UserId = userId,
                    Type = TaskType.EmergencyFundContribution,
                    Title = "Build Emergency Fund",
                    Description = (user?.AnnualIncome.HasValue == true) 
                        ? $"Build emergency fund to ${emergencyTarget:N0}. With ${user.AnnualIncome.Value:N0} annual income, aim for 3-6 months expenses."
                        : "Establish or increase emergency fund to cover 3-6 months of expenses.",
                    Priority = TaskPriority.High
                });
            }

            return recommendations;
        }

        private string BuildPortfolioAnalysisPrompt(User? user, List<Account> accounts, List<Goal>? goals)
        {
            var prompt = "Analyze this portfolio:\n\n";
            
            // Calculate age and years of service for use throughout method
            int? age = null;
            double? yearsOfService = null;
            
            if (user?.DateOfBirth.HasValue == true)
            {
                var today = DateTime.UtcNow;
                age = today.Year - user.DateOfBirth.Value.Year;
                if (user.DateOfBirth.Value.Date > today.AddYears(-age.Value).Date)
                    age--;
            }

            if (user?.ServiceComputationDate.HasValue == true)
            {
                yearsOfService = (DateTime.UtcNow - user.ServiceComputationDate.Value).TotalDays / 365.25;
            }
            
            // Add comprehensive user demographics for personalized recommendations
            if (user != null)
            {
                prompt += "User Profile:\n";

                if (age.HasValue) 
                    prompt += $"- Age: {age} years old\n";
                if (!string.IsNullOrEmpty(user.EmploymentType))
                    prompt += $"- Employment: {user.EmploymentType}";
                if (!string.IsNullOrEmpty(user.PayGrade))
                    prompt += $" ({user.PayGrade})";
                prompt += "\n";

                if (user.AnnualIncome.HasValue)
                    prompt += $"- Annual Income: ${user.AnnualIncome:N0}\n";
                if (yearsOfService.HasValue)
                    prompt += $"- Years of Service: {yearsOfService:F1} years\n";
                if (!string.IsNullOrEmpty(user.RetirementSystem))
                    prompt += $"- Retirement System: {user.RetirementSystem}\n";
                
                // Government benefits
                if (user.VADisabilityPercentage.HasValue && user.VADisabilityPercentage > 0)
                {
                    prompt += $"- VA Disability: {user.VADisabilityPercentage}%";
                    if (user.VADisabilityMonthlyAmount.HasValue)
                        prompt += $" (${user.VADisabilityMonthlyAmount:N0}/month)";
                    prompt += "\n";
                }

                // Risk profile and goals
                prompt += $"- Risk Tolerance: {user.RiskTolerance}/10\n";
                if (user.EmergencyFundTarget > 0)
                    prompt += $"- Emergency Fund Target: ${user.EmergencyFundTarget:N0}\n";
                if (user.RetirementGoalAmount.HasValue)
                    prompt += $"- Retirement Goal: ${user.RetirementGoalAmount:N0}\n";
                if (user.TargetRetirementDate.HasValue)
                {
                    var yearsToRetirement = (user.TargetRetirementDate.Value - DateTime.UtcNow).TotalDays / 365.25;
                    prompt += $"- Target Retirement: {user.TargetRetirementDate.Value:yyyy-MM-dd} ({yearsToRetirement:F0} years away)\n";
                }

                prompt += "\n";
            }
            
            prompt += "Accounts:\n";
            foreach (var account in accounts)
            {
                prompt += $"- {account.AccountType}: ${account.CurrentBalance:N2} ({account.Institution})\n";
                if (account.Holdings?.Any() == true)
                {
                    foreach (var holding in account.Holdings)
                    {
                        prompt += $"  * {holding.Symbol}: {holding.Quantity} shares @ ${holding.CurrentPrice:F2}\n";
                    }
                }
            }

            if (goals?.Any() == true)
            {
                prompt += "\nGoals:\n";
                foreach (var goal in goals)
                {
                    prompt += $"- {goal.Name}: ${goal.CurrentAmount:N2} / ${goal.TargetAmount:N2} by {goal.TargetDate:yyyy-MM-dd}\n";
                }
            }

            // Add demographic-specific guidance for AI
            if (user != null)
            {
                prompt += "\nProvide recommendations considering:\n";
                if (age.HasValue)
                {
                    if (age < 30)
                        prompt += "- Young professional: Focus on aggressive growth, TSP maximization, and long-term wealth building\n";
                    else if (age < 45)
                        prompt += "- Mid-career professional: Balance growth with risk management, catch-up contributions\n";
                    else
                        prompt += "- Pre-retirement: Focus on capital preservation, income generation, and retirement readiness\n";
                }

                if (!string.IsNullOrEmpty(user.EmploymentType))
                {
                    if (user.EmploymentType.Contains("Military") || user.EmploymentType.Contains("Federal"))
                        prompt += "- Government employee: Consider TSP benefits, FERS/CSRS implications, and federal-specific advantages\n";
                }

                if (user.VADisabilityPercentage.HasValue && user.VADisabilityPercentage > 0)
                    prompt += "- Military veteran: Factor in VA disability income stability for risk tolerance\n";
            }

            return prompt;
        }

        private List<CreateTaskRequest> ParseAITaskRecommendations(string aiResponse, int userId)
        {
            // Simple parsing - in production, would use robust JSON parsing
            var tasks = new List<CreateTaskRequest>();
            
            // For now, return a sample task if AI parsing fails
            tasks.Add(new CreateTaskRequest
            {
                UserId = userId,
                Type = TaskType.Rebalancing,
                Title = "AI-Generated Portfolio Review",
                Description = "Review portfolio based on AI analysis: " + aiResponse.Substring(0, Math.Min(aiResponse.Length, 200)),
                Priority = TaskPriority.Medium
            });

            return tasks;
        }

        private string GenerateFallbackAnalysis(List<Account> accounts)
        {
            var totalBalance = accounts.Sum(a => a.CurrentBalance);
            var accountCount = accounts.Count;
            
            return $"Portfolio Summary:\n" +
                   $"- Total Portfolio Value: ${totalBalance:N2}\n" +
                   $"- Number of Accounts: {accountCount}\n" +
                   $"- Recommendation: Regular portfolio review recommended to ensure optimal allocation.";
        }

        private string GenerateFallbackAnalysisWithMarketData(List<Account> accounts, MarketIndices marketIndices, EconomicIndicators economicIndicators, Dictionary<string, MarketPrice>? tspFunds)
        {
            var totalBalance = accounts.Sum(a => a.CurrentBalance);
            var accountCount = accounts.Count;
            
            var analysis = $"Portfolio Summary with Current Market Conditions:\n\n";
            analysis += $"Portfolio Overview:\n";
            analysis += $"- Total Portfolio Value: ${totalBalance:N2}\n";
            analysis += $"- Number of Accounts: {accountCount}\n\n";
            
            analysis += $"Current Market Conditions ({marketIndices.LastUpdated:yyyy-MM-dd HH:mm}):\n";
            analysis += $"- S&P 500: {marketIndices.SP500.Price:F2} ({marketIndices.SP500.ChangePercent:+0.00;-0.00}%)\n";
            analysis += $"- NASDAQ: {marketIndices.NASDAQ.Price:F2} ({marketIndices.NASDAQ.ChangePercent:+0.00;-0.00}%)\n";
            analysis += $"- VIX (Fear Index): {marketIndices.VIX.Price:F2}\n";
            analysis += $"- Market Status: {marketIndices.MarketStatus}\n\n";
            
            analysis += $"Economic Indicators:\n";
            analysis += $"- 10-Year Treasury: {economicIndicators.TreasuryYield10Year:F2}%\n";
            analysis += $"- Fed Funds Rate: {economicIndicators.FedFundsRate}\n";
            analysis += $"- Gold Price: ${economicIndicators.GoldPrice:F2}\n\n";
            
            if (tspFunds?.Any() == true)
            {
                analysis += $"TSP Fund Performance:\n";
                foreach (var fund in tspFunds.Take(5)) // Show top 5 funds
                {
                    analysis += $"- {fund.Value.CompanyName}: {fund.Value.Price:F2} ({fund.Value.ChangePercent:+0.00;-0.00}%)\n";
                }
                analysis += "\n";
            }
            
            // Market-based recommendations
            var volatilityLevel = marketIndices.VIX.Price > 25 ? "High" : marketIndices.VIX.Price > 15 ? "Moderate" : "Low";
            analysis += $"Market-Based Recommendations:\n";
            analysis += $"- Current market volatility: {volatilityLevel}\n";
            if (marketIndices.VIX.Price > 25)
                analysis += $"- Consider defensive positioning during high volatility periods\n";
            else if (marketIndices.VIX.Price < 15)
                analysis += $"- Market complacency detected - consider rebalancing opportunities\n";
            
            if (economicIndicators.TreasuryYield10Year > 4.5m)
                analysis += $"- High bond yields present attractive fixed-income opportunities\n";
            
            analysis += $"- Regular portfolio review recommended based on current market conditions";
            
            return analysis;
        }

        private string BuildMarketAwarePortfolioPrompt(User? user, List<Account> accounts, List<Goal>? goals, MarketIndices marketIndices, EconomicIndicators economicIndicators, Dictionary<string, MarketPrice>? tspFunds)
        {
            var prompt = BuildPortfolioAnalysisPrompt(user, accounts, goals);
            
            // Add current market context
            prompt += $"\n=== CURRENT MARKET CONDITIONS ({marketIndices.LastUpdated:yyyy-MM-dd HH:mm}) ===\n";
            prompt += $"Market Indices:\n";
            prompt += $"- S&P 500: {marketIndices.SP500.Price:F2} ({marketIndices.SP500.ChangePercent:+0.00;-0.00}%, Volume: {marketIndices.SP500.Volume:N0})\n";
            prompt += $"- NASDAQ: {marketIndices.NASDAQ.Price:F2} ({marketIndices.NASDAQ.ChangePercent:+0.00;-0.00}%, Volume: {marketIndices.NASDAQ.Volume:N0})\n";
            prompt += $"- Dow Jones: {marketIndices.DowJones.Price:F2} ({marketIndices.DowJones.ChangePercent:+0.00;-0.00}%)\n";
            prompt += $"- Russell 2000: {marketIndices.Russell2000.Price:F2} ({marketIndices.Russell2000.ChangePercent:+0.00;-0.00}%)\n";
            prompt += $"- VIX (Volatility): {marketIndices.VIX.Price:F2}\n";
            prompt += $"- Market Status: {marketIndices.MarketStatus}\n\n";
            
            prompt += $"Economic Indicators:\n";
            prompt += $"- 10-Year Treasury Yield: {economicIndicators.TreasuryYield10Year:F2}%\n";
            prompt += $"- 2-Year Treasury Yield: {economicIndicators.TreasuryYield2Year:F2}%\n";
            prompt += $"- Federal Funds Rate: {economicIndicators.FedFundsRate}\n";
            prompt += $"- US Dollar Index: {economicIndicators.DollarIndex:F2}\n";
            prompt += $"- Crude Oil: ${economicIndicators.CrudeOilPrice:F2}\n";
            prompt += $"- Gold: ${economicIndicators.GoldPrice:F2}\n";
            prompt += $"- Bitcoin: ${economicIndicators.BitcoinPrice:F2}\n\n";
            
            if (tspFunds?.Any() == true)
            {
                prompt += $"Current TSP Fund Prices:\n";
                foreach (var fund in tspFunds)
                {
                    prompt += $"- {fund.Key} ({fund.Value.CompanyName}): {fund.Value.Price:F2} ({fund.Value.ChangePercent:+0.00;-0.00}%)\n";
                }
                prompt += "\n";
            }
            
            // Add market-specific analysis instructions
            prompt += "=== ANALYSIS REQUIREMENTS ===\n";
            prompt += "Provide comprehensive investment advice that incorporates:\n";
            prompt += "1. Current market conditions and their impact on this specific portfolio\n";
            prompt += "2. Economic indicators analysis and positioning recommendations\n";
            prompt += "3. Volatility assessment (VIX) and appropriate risk adjustments\n";
            prompt += "4. Sector rotation opportunities based on current market trends\n";
            prompt += "5. TSP fund recommendations if applicable, considering current performance\n";
            prompt += "6. Interest rate environment impact on bond vs equity allocation\n";
            prompt += "7. Specific action items with timeline (immediate, 30-day, quarterly)\n";
            prompt += "8. Market timing considerations vs dollar-cost averaging strategies\n";
            prompt += "9. Rebalancing recommendations based on current valuations\n";
            prompt += "10. Risk management strategies for current market environment\n\n";
            
            prompt += "Focus on actionable, specific recommendations that this investor can implement given their profile and current market conditions.";
            
            return prompt;
        }
    }
}