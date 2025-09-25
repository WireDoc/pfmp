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

        public AIService(ApplicationDbContext context, ILogger<AIService> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;

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
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                if (_chatClient == null)
                {
                    return GenerateFallbackAnalysis(accounts);
                }

                var prompt = BuildPortfolioAnalysisPrompt(null, accounts, null);
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage("You are a financial advisor. Provide a comprehensive but concise portfolio analysis with specific recommendations."),
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

        public Task<List<Alert>> GenerateMarketAlertsAsync(int userId)
        {
            try
            {
                // This would integrate with market data APIs in a full implementation
                // For now, return basic alerts based on portfolio analysis
                return Task.FromResult(new List<Alert>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating market alerts for user {UserId}", userId);
                return Task.FromResult(new List<Alert>());
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
    }
}