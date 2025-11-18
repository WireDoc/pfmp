using Microsoft.AspNetCore.Mvc;
using PFMP_API.Models.Analytics;
using PFMP_API.Services;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Controllers;

/// <summary>
/// API endpoints for portfolio analytics (performance, tax, risk, allocation)
/// </summary>
[ApiController]
[Route("api/portfolios")]
public class PortfolioAnalyticsController : ControllerBase
{
    private readonly PerformanceCalculationService _performanceService;
    private readonly TaxInsightsService _taxService;
    private readonly RiskAnalysisService _riskService;
    private readonly BenchmarkDataService _benchmarkService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PortfolioAnalyticsController> _logger;

    public PortfolioAnalyticsController(
        PerformanceCalculationService performanceService,
        TaxInsightsService taxService,
        RiskAnalysisService riskService,
        BenchmarkDataService benchmarkService,
        ApplicationDbContext context,
        ILogger<PortfolioAnalyticsController> logger)
    {
        _performanceService = performanceService;
        _taxService = taxService;
        _riskService = riskService;
        _benchmarkService = benchmarkService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get performance metrics (TWR, MWR, Sharpe ratio, benchmark comparison)
    /// </summary>
    /// <param name="accountId">Account ID</param>
    /// <param name="period">Time period (1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, All)</param>
    [HttpGet("{accountId}/performance")]
    public async Task<ActionResult<PerformanceMetrics>> GetPerformanceMetrics(
        int accountId,
        [FromQuery] string period = "1Y")
    {
        try
        {
            _logger.LogInformation("Fetching performance metrics for account {AccountId}, period {Period}", accountId, period);

            var (startDate, endDate) = ParsePeriod(period);
            
            _logger.LogInformation("Date range: {StartDate} to {EndDate}", startDate, endDate);

            // Calculate core metrics
            var twr = await _performanceService.CalculateTWRAsync(accountId, startDate, endDate);
            var mwr = await _performanceService.CalculateMWRAsync(accountId, startDate, endDate);
            var volatility = await _performanceService.CalculateVolatilityAsync(accountId, startDate, endDate);
            var sharpeRatio = _performanceService.CalculateSharpeRatio(twr, volatility);

            // Get benchmark data
            var benchmarkReturns = await _benchmarkService.GetBenchmarkReturnsAsync(startDate, endDate);
            var benchmarks = new List<BenchmarkComparison>
            {
                new() { Name = "S&P 500", Symbol = "SPY", Return = benchmarkReturns.GetValueOrDefault("SPY"), Volatility = 16.2m, SharpeRatio = 0 },
                new() { Name = "Nasdaq 100", Symbol = "QQQ", Return = benchmarkReturns.GetValueOrDefault("QQQ"), Volatility = 22.4m, SharpeRatio = 0 },
                new() { Name = "Russell 2000", Symbol = "IWM", Return = benchmarkReturns.GetValueOrDefault("IWM"), Volatility = 20.1m, SharpeRatio = 0 },
                new() { Name = "Total Market", Symbol = "VTI", Return = benchmarkReturns.GetValueOrDefault("VTI"), Volatility = 16.8m, SharpeRatio = 0 }
            };

            // Calculate Sharpe ratios for benchmarks
            foreach (var benchmark in benchmarks)
            {
                benchmark.SharpeRatio = _performanceService.CalculateSharpeRatio(benchmark.Return, benchmark.Volatility);
            }

            // Calculate total return in dollars from holdings
            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .ToListAsync();

            decimal currentValue = holdings.Sum(h => h.Quantity * h.CurrentPrice);
            decimal costBasis = holdings.Sum(h => h.Quantity * h.AverageCostBasis);
            decimal dollarReturn = currentValue - costBasis;

            var totalReturn = new ReturnValue
            {
                Dollar = dollarReturn,
                Percent = twr
            };

            // Get historical performance data
            _logger.LogInformation("Fetching historical performance data...");
            var historicalData = await _performanceService.GetHistoricalPerformanceAsync(accountId, startDate, endDate);
            _logger.LogInformation("Retrieved {Count} historical data points", historicalData.Count);
            
            // Calculate cumulative returns for charting
            var historicalPerformance = new List<PerformanceDataPoint>();
            if (historicalData.Count > 0)
            {
                var initialValue = historicalData.First().PortfolioValue;
                foreach (var point in historicalData)
                {
                    var portfolioReturn = initialValue > 0 
                        ? ((point.PortfolioValue - initialValue) / initialValue) * 100 
                        : 0;
                    
                    historicalPerformance.Add(new PerformanceDataPoint
                    {
                        Date = point.Date,
                        PortfolioValue = point.PortfolioValue,
                        BenchmarkValue = portfolioReturn // Store return % for now, benchmark TODO
                    });
                }
            }

            var metrics = new PerformanceMetrics
            {
                TotalReturn = totalReturn,
                TimeWeightedReturn = twr,
                MoneyWeightedReturn = mwr,
                SharpeRatio = sharpeRatio,
                Volatility = volatility,
                Benchmarks = benchmarks,
                HistoricalPerformance = historicalPerformance
            };

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching performance metrics for account {AccountId}", accountId);
            return StatusCode(500, new { message = "An error occurred while calculating performance metrics", error = ex.Message });
        }
    }

    /// <summary>
    /// Get asset allocation breakdown
    /// </summary>
    /// <param name="accountId">Account ID</param>
    /// <param name="dimension">Allocation dimension (assetClass, sector, geography, marketCap)</param>
    [HttpGet("{accountId}/allocation")]
    public async Task<ActionResult<AllocationBreakdown>> GetAllocation(
        int accountId,
        [FromQuery] string dimension = "assetClass")
    {
        try
        {
            _logger.LogInformation("Fetching allocation for account {AccountId}, dimension {Dimension}", accountId, dimension);

            // TODO: Implement allocation calculation based on dimension
            // For now, return placeholder data

            var allocation = new AllocationBreakdown
            {
                Dimension = dimension,
                Allocations = new List<AllocationItem>(),
                RebalancingRecommendations = new List<RebalancingRecommendation>()
            };

            return Ok(allocation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching allocation for account {AccountId}", accountId);
            return StatusCode(500, new { message = "An error occurred while calculating allocation", error = ex.Message });
        }
    }

    /// <summary>
    /// Get tax insights (unrealized gains/losses, harvesting opportunities)
    /// </summary>
    /// <param name="accountId">Account ID</param>
    [HttpGet("{accountId}/tax-insights")]
    public async Task<ActionResult<TaxInsights>> GetTaxInsights(int accountId)
    {
        try
        {
            _logger.LogInformation("Fetching tax insights for account {AccountId}", accountId);

            var taxInsights = await _taxService.CalculateTaxInsightsAsync(accountId);

            return Ok(taxInsights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tax insights for account {AccountId}", accountId);
            return StatusCode(500, new { message = "An error occurred while calculating tax insights", error = ex.Message });
        }
    }

    /// <summary>
    /// Get risk metrics (volatility, beta, max drawdown, correlation)
    /// </summary>
    /// <param name="accountId">Account ID</param>
    /// <param name="period">Time period for risk calculations (default: 1Y)</param>
    [HttpGet("{accountId}/risk-metrics")]
    public async Task<ActionResult<RiskMetrics>> GetRiskMetrics(
        int accountId,
        [FromQuery] string period = "1Y")
    {
        try
        {
            _logger.LogInformation("Fetching risk metrics for account {AccountId}, period {Period}", accountId, period);

            var (startDate, endDate) = ParsePeriod(period);

            var riskMetrics = await _riskService.CalculateRiskMetricsAsync(accountId, startDate, endDate);

            return Ok(riskMetrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching risk metrics for account {AccountId}", accountId);
            return StatusCode(500, new { message = "An error occurred while calculating risk metrics", error = ex.Message });
        }
    }

    /// <summary>
    /// Parse period string into date range
    /// </summary>
    private (DateTime startDate, DateTime endDate) ParsePeriod(string period)
    {
        var endDate = DateTime.UtcNow;
        var startDate = period.ToUpper() switch
        {
            "1M" => endDate.AddMonths(-1),
            "3M" => endDate.AddMonths(-3),
            "6M" => endDate.AddMonths(-6),
            "YTD" => DateTime.SpecifyKind(new DateTime(endDate.Year, 1, 1), DateTimeKind.Utc),
            "1Y" => endDate.AddYears(-1),
            "3Y" => endDate.AddYears(-3),
            "5Y" => endDate.AddYears(-5),
            "ALL" => endDate.AddYears(-10), // Max 10 years back
            _ => endDate.AddYears(-1) // Default to 1 year
        };

        return (startDate, endDate);
    }
}
