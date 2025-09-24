using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Interface for AI-powered financial analysis and recommendation services
    /// </summary>
    public interface IAIService
    {
        /// <summary>
        /// Analyzes user's portfolio and generates intelligent task recommendations
        /// </summary>
        /// <param name="userId">User ID to analyze</param>
        /// <returns>List of recommended tasks</returns>
        Task<List<CreateTaskRequest>> GenerateTaskRecommendationsAsync(int userId);

        /// <summary>
        /// Analyzes a task and provides AI-powered priority recommendation
        /// </summary>
        /// <param name="task">Task to analyze</param>
        /// <returns>Recommended priority level</returns>
        Task<TaskPriority> RecommendTaskPriorityAsync(CreateTaskRequest task);

        /// <summary>
        /// Generates intelligent categorization for a task based on description
        /// </summary>
        /// <param name="title">Task title</param>
        /// <param name="description">Task description</param>
        /// <returns>Recommended task type</returns>
        Task<TaskType> CategorizeTaskAsync(string title, string description);

        /// <summary>
        /// Analyzes portfolio data and generates actionable insights
        /// </summary>
        /// <param name="userId">User ID to analyze</param>
        /// <returns>Portfolio analysis summary</returns>
        Task<string> AnalyzePortfolioAsync(int userId);

        /// <summary>
        /// Generates market-based alerts for user's portfolio
        /// </summary>
        /// <param name="userId">User ID to analyze</param>
        /// <returns>List of generated alerts</returns>
        Task<List<Alert>> GenerateMarketAlertsAsync(int userId);

        /// <summary>
        /// Provides AI-powered explanation for a recommended action
        /// </summary>
        /// <param name="recommendation">The recommendation to explain</param>
        /// <returns>Human-readable explanation</returns>
        Task<string> ExplainRecommendationAsync(string recommendation);
    }
}