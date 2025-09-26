using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Portfolio controller for real-time valuation and performance tracking
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PortfolioController : ControllerBase
    {
        private readonly IPortfolioValuationService _portfolioService;
        private readonly ILogger<PortfolioController> _logger;

        public PortfolioController(IPortfolioValuationService portfolioService, ILogger<PortfolioController> logger)
        {
            _portfolioService = portfolioService;
            _logger = logger;
        }

        /// <summary>
        /// Get current total portfolio value for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Complete portfolio valuation</returns>
        [HttpGet("{userId}/valuation")]
        public async Task<ActionResult<PortfolioValuation>> GetPortfolioValuation(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var valuation = await _portfolioService.GetCurrentPortfolioValueAsync(userId);
                return Ok(valuation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting portfolio valuation for user {UserId}", userId);
                return StatusCode(500, "Internal server error while calculating portfolio value");
            }
        }

        /// <summary>
        /// Get detailed account valuations with current market prices
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of account valuations</returns>
        [HttpGet("{userId}/accounts")]
        public async Task<ActionResult<List<AccountValuation>>> GetAccountValuations(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var valuations = await _portfolioService.GetAccountValuationsAsync(userId);
                return Ok(valuations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account valuations for user {UserId}", userId);
                return StatusCode(500, "Internal server error while calculating account values");
            }
        }

        /// <summary>
        /// Update holdings with current market prices
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Success status</returns>
        [HttpPost("{userId}/update-prices")]
        public async Task<ActionResult> UpdateHoldingPrices(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                await _portfolioService.UpdateHoldingPricesAsync(userId);
                return Ok(new { message = "Holding prices updated successfully", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating holding prices for user {UserId}", userId);
                return StatusCode(500, "Internal server error while updating prices");
            }
        }

        /// <summary>
        /// Get portfolio performance metrics
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Portfolio performance data</returns>
        [HttpGet("{userId}/performance")]
        public async Task<ActionResult<PortfolioPerformance>> GetPortfolioPerformance(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var performance = await _portfolioService.GetPortfolioPerformanceAsync(userId);
                return Ok(performance);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting portfolio performance for user {UserId}", userId);
                return StatusCode(500, "Internal server error while calculating performance");
            }
        }

        /// <summary>
        /// Get complete net worth summary including all assets
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Net worth summary</returns>
        [HttpGet("{userId}/net-worth")]
        public async Task<ActionResult<NetWorthSummary>> GetNetWorth(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                var netWorth = await _portfolioService.GetNetWorthSummaryAsync(userId);
                return Ok(netWorth);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting net worth for user {UserId}", userId);
                return StatusCode(500, "Internal server error while calculating net worth");
            }
        }

        /// <summary>
        /// Get comprehensive portfolio dashboard data
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Complete portfolio dashboard</returns>
        [HttpGet("{userId}/dashboard")]
        public async Task<ActionResult<PortfolioDashboard>> GetPortfolioDashboard(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid user ID is required");
                }

                // Get all portfolio data in parallel for faster response
                var valuationTask = _portfolioService.GetCurrentPortfolioValueAsync(userId);
                var accountsTask = _portfolioService.GetAccountValuationsAsync(userId);
                var performanceTask = _portfolioService.GetPortfolioPerformanceAsync(userId);
                var netWorthTask = _portfolioService.GetNetWorthSummaryAsync(userId);

                await Task.WhenAll(valuationTask, accountsTask, performanceTask, netWorthTask);

                var dashboard = new PortfolioDashboard
                {
                    UserId = userId,
                    LastUpdated = DateTime.UtcNow,
                    Valuation = await valuationTask,
                    Accounts = await accountsTask,
                    Performance = await performanceTask,
                    NetWorth = await netWorthTask
                };

                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting portfolio dashboard for user {UserId}", userId);
                return StatusCode(500, "Internal server error while building dashboard");
            }
        }
    }

    /// <summary>
    /// Comprehensive portfolio dashboard data
    /// </summary>
    public class PortfolioDashboard
    {
        public int UserId { get; set; }
        public DateTime LastUpdated { get; set; }
        public PortfolioValuation Valuation { get; set; } = new();
        public List<AccountValuation> Accounts { get; set; } = new();
        public PortfolioPerformance Performance { get; set; } = new();
        public NetWorthSummary NetWorth { get; set; } = new();
    }
}