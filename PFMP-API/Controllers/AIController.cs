using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// AI-powered financial analysis controller
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IAIService _aiService;
        private readonly ILogger<AIController> _logger;

        public AIController(IAIService aiService, ILogger<AIController> logger)
        {
            _aiService = aiService;
            _logger = logger;
        }

        /// <summary>
        /// Get AI-powered portfolio analysis with market data integration
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Comprehensive portfolio analysis incorporating current market conditions</returns>
        [HttpGet("analyze-portfolio/{userId}")]
        public async Task<ActionResult<string>> AnalyzePortfolio(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var analysis = await _aiService.AnalyzePortfolioAsync(userId);
                
                if (string.IsNullOrEmpty(analysis))
                {
                    return NotFound("Unable to generate portfolio analysis for the specified user");
                }

                return Ok(new { analysis, timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing portfolio for user {UserId}", userId);
                return StatusCode(500, "Internal server error while analyzing portfolio");
            }
        }

        /// <summary>
        /// Generate AI task recommendations based on portfolio and market conditions
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of recommended tasks</returns>
        [HttpGet("task-recommendations/{userId}")]
        public async Task<ActionResult<List<CreateTaskRequest>>> GenerateTaskRecommendations(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var tasks = await _aiService.GenerateTaskRecommendationsAsync(userId);
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating task recommendations for user {UserId}", userId);
                return StatusCode(500, "Internal server error while generating task recommendations");
            }
        }

        /// <summary>
        /// Generate market-aware alerts based on current conditions and user profile
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of relevant market alerts</returns>
        [HttpGet("market-alerts/{userId}")]
        public async Task<ActionResult<List<PFMP_API.Models.Alert>>> GenerateMarketAlerts(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var alerts = await _aiService.GenerateMarketAlertsAsync(userId);
                return Ok(alerts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating market alerts for user {UserId}", userId);
                return StatusCode(500, "Internal server error while generating market alerts");
            }
        }

        /// <summary>
        /// Get AI explanation for a specific recommendation
        /// </summary>
        /// <param name="recommendation">The recommendation text to explain</param>
        /// <returns>Detailed explanation of the recommendation</returns>
        [HttpPost("explain-recommendation")]
        public async Task<ActionResult<string>> ExplainRecommendation([FromBody] RecommendationRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Recommendation))
                {
                    return BadRequest("Recommendation text is required");
                }

                var explanation = await _aiService.ExplainRecommendationAsync(request.Recommendation);
                return Ok(new { explanation, timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error explaining recommendation: {Recommendation}", request.Recommendation);
                return StatusCode(500, "Internal server error while explaining recommendation");
            }
        }

        /// <summary>
        /// Get comprehensive AI insights combining portfolio analysis and market alerts
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Complete AI insights package</returns>
        [HttpGet("comprehensive-insights/{userId}")]
        public async Task<ActionResult<AIInsightsResponse>> GetComprehensiveInsights(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                // Execute all AI services in parallel for efficiency
                var portfolioAnalysisTask = _aiService.AnalyzePortfolioAsync(userId);
                var taskRecommendationsTask = _aiService.GenerateTaskRecommendationsAsync(userId);
                var marketAlertsTask = _aiService.GenerateMarketAlertsAsync(userId);

                await Task.WhenAll(portfolioAnalysisTask, taskRecommendationsTask, marketAlertsTask);

                var insights = new AIInsightsResponse
                {
                    UserId = userId,
                    PortfolioAnalysis = await portfolioAnalysisTask,
                    TaskRecommendations = await taskRecommendationsTask,
                    MarketAlerts = await marketAlertsTask,
                    GeneratedAt = DateTime.UtcNow
                };

                return Ok(insights);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating comprehensive insights for user {UserId}", userId);
                return StatusCode(500, "Internal server error while generating comprehensive insights");
            }
        }
    }

    /// <summary>
    /// Request model for recommendation explanation
    /// </summary>
    public class RecommendationRequest
    {
        public string Recommendation { get; set; } = string.Empty;
    }

    /// <summary>
    /// Comprehensive AI insights response
    /// </summary>
    public class AIInsightsResponse
    {
        public int UserId { get; set; }
        public string PortfolioAnalysis { get; set; } = string.Empty;
        public List<CreateTaskRequest> TaskRecommendations { get; set; } = new();
        public List<PFMP_API.Models.Alert> MarketAlerts { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
    }
}