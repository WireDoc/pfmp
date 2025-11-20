using PFMP_API.Models;
using PFMP_API.Models.Analytics;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating portfolio risk metrics
/// </summary>
public class RiskAnalysisService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RiskAnalysisService> _logger;
    private readonly PerformanceCalculationService _performanceService;

    public RiskAnalysisService(
        ApplicationDbContext context,
        ILogger<RiskAnalysisService> logger,
        PerformanceCalculationService performanceService)
    {
        _context = context;
        _logger = logger;
        _performanceService = performanceService;
    }

    /// <summary>
    /// Calculate comprehensive risk metrics for an account
    /// </summary>
    public async Task<RiskMetrics> CalculateRiskMetricsAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var volatility = await _performanceService.CalculateVolatilityAsync(accountId, startDate, endDate);
            var beta = await CalculateBetaAsync(accountId, startDate, endDate);
            var (maxDrawdown, peakDate, troughDate) = await CalculateMaxDrawdownAsync(accountId, startDate, endDate);
            var correlationMatrix = await CalculateCorrelationMatrixAsync(accountId, startDate, endDate);
            var volatilityHistory = await CalculateVolatilityHistoryAsync(accountId, startDate, endDate);
            var drawdownHistory = await CalculateDrawdownHistoryAsync(accountId, startDate, endDate);

            return new RiskMetrics
            {
                Volatility = volatility,
                Beta = beta,
                MaxDrawdown = maxDrawdown,
                MaxDrawdownPeakDate = peakDate,
                MaxDrawdownTroughDate = troughDate,
                CorrelationMatrix = correlationMatrix,
                VolatilityHistory = volatilityHistory,
                DrawdownHistory = drawdownHistory
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating risk metrics for account {AccountId}", accountId);
            throw;
        }
    }

    /// <summary>
    /// Calculate Beta (portfolio sensitivity to market movements)
    /// </summary>
    private async Task<decimal> CalculateBetaAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            // Get portfolio daily returns
            var portfolioReturns = await GetDailyReturnsAsync(accountId, startDate, endDate);

            // Get S&P 500 returns (using SPY as proxy)
            var marketReturns = await GetMarketReturnsAsync("SPY", startDate, endDate);

            if (portfolioReturns.Count < 2 || marketReturns.Count < 2 || portfolioReturns.Count != marketReturns.Count)
            {
                return 1.0m; // Default to market beta if insufficient data
            }

            // Calculate covariance and variance
            var portfolioMean = portfolioReturns.Average();
            var marketMean = marketReturns.Average();

            decimal covariance = 0;
            decimal marketVariance = 0;

            for (int i = 0; i < portfolioReturns.Count; i++)
            {
                covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
                marketVariance += (decimal)Math.Pow((double)(marketReturns[i] - marketMean), 2);
            }

            covariance /= (portfolioReturns.Count - 1);
            marketVariance /= (marketReturns.Count - 1);

            if (marketVariance == 0)
            {
                return 1.0m;
            }

            return covariance / marketVariance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating beta for account {AccountId}", accountId);
            return 1.0m;
        }
    }

    /// <summary>
    /// Calculate Maximum Drawdown (largest peak-to-trough decline)
    /// </summary>
    private async Task<(decimal maxDrawdown, DateTime? peakDate, DateTime? troughDate)> 
        CalculateMaxDrawdownAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var dailyBalances = await GetDailyBalancesAsync(accountId, startDate, endDate);

            if (dailyBalances.Count < 2)
            {
                return (0, null, null);
            }

            decimal maxDrawdown = 0;
            decimal peak = dailyBalances[0].Balance;
            DateTime peakDate = dailyBalances[0].Date;
            DateTime troughDate = dailyBalances[0].Date;

            foreach (var balance in dailyBalances)
            {
                if (balance.Balance > peak)
                {
                    peak = balance.Balance;
                    peakDate = balance.Date;
                }

                var drawdown = peak != 0 ? ((balance.Balance - peak) / peak) * 100 : 0;

                if (drawdown < maxDrawdown)
                {
                    maxDrawdown = drawdown;
                    troughDate = balance.Date;
                }
            }

            return (maxDrawdown, peakDate, troughDate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating max drawdown for account {AccountId}", accountId);
            return (0, null, null);
        }
    }

    /// <summary>
    /// Calculate correlation matrix between holdings and benchmarks
    /// </summary>
    private async Task<List<CorrelationPair>> CalculateCorrelationMatrixAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var correlations = new List<CorrelationPair>();

            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .Take(10) // Limit to top 10 holdings for performance
                .ToListAsync();

            // Calculate correlations between major holdings
            for (int i = 0; i < holdings.Count; i++)
            {
                for (int j = i + 1; j < holdings.Count; j++)
                {
                    var correlation = await CalculateCorrelationAsync(
                        holdings[i].Symbol, 
                        holdings[j].Symbol, 
                        startDate, 
                        endDate);

                    correlations.Add(new CorrelationPair
                    {
                        Symbol1 = holdings[i].Symbol,
                        Symbol2 = holdings[j].Symbol,
                        Correlation = correlation
                    });
                }

                // Calculate correlation with S&P 500
                var spyCorrelation = await CalculateCorrelationAsync(
                    holdings[i].Symbol, 
                    "SPY", 
                    startDate, 
                    endDate);

                correlations.Add(new CorrelationPair
                {
                    Symbol1 = holdings[i].Symbol,
                    Symbol2 = "SPY",
                    Correlation = spyCorrelation
                });
            }

            return correlations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating correlation matrix for account {AccountId}", accountId);
            return new List<CorrelationPair>();
        }
    }

    /// <summary>
    /// Calculate correlation between two securities
    /// </summary>
    private async Task<decimal> CalculateCorrelationAsync(string symbol1, string symbol2, DateTime startDate, DateTime endDate)
    {
        try
        {
            // Get price history for both symbols
            var prices1 = await GetPriceHistoryAsync(symbol1, startDate, endDate);
            var prices2 = await GetPriceHistoryAsync(symbol2, startDate, endDate);

            if (prices1.Count < 2 || prices2.Count < 2 || prices1.Count != prices2.Count)
            {
                return 0;
            }

            // Calculate returns
            var returns1 = CalculateReturns(prices1);
            var returns2 = CalculateReturns(prices2);

            // Calculate correlation coefficient
            var mean1 = returns1.Average();
            var mean2 = returns2.Average();

            decimal covariance = 0;
            decimal variance1 = 0;
            decimal variance2 = 0;

            for (int i = 0; i < returns1.Count; i++)
            {
                var diff1 = returns1[i] - mean1;
                var diff2 = returns2[i] - mean2;

                covariance += diff1 * diff2;
                variance1 += diff1 * diff1;
                variance2 += diff2 * diff2;
            }

            var stdDev1 = (decimal)Math.Sqrt((double)variance1);
            var stdDev2 = (decimal)Math.Sqrt((double)variance2);

            if (stdDev1 == 0 || stdDev2 == 0)
            {
                return 0;
            }

            return covariance / (stdDev1 * stdDev2);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating correlation between {Symbol1} and {Symbol2}", symbol1, symbol2);
            return 0;
        }
    }

    /// <summary>
    /// Calculate 30-day rolling volatility over time
    /// </summary>
    private async Task<List<VolatilityDataPoint>> CalculateVolatilityHistoryAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var volatilityHistory = new List<VolatilityDataPoint>();
            var window = 30; // 30-day rolling window

            var currentDate = startDate.AddDays(window);

            while (currentDate <= endDate)
            {
                var windowStart = currentDate.AddDays(-window);
                var volatility = await _performanceService.CalculateVolatilityAsync(accountId, windowStart, currentDate);

                volatilityHistory.Add(new VolatilityDataPoint
                {
                    Date = currentDate,
                    Volatility = volatility
                });

                currentDate = currentDate.AddDays(7); // Weekly snapshots
            }

            return volatilityHistory;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating volatility history for account {AccountId}", accountId);
            return new List<VolatilityDataPoint>();
        }
    }

    /// <summary>
    /// Calculate drawdown history (underwater chart)
    /// </summary>
    private async Task<List<DrawdownDataPoint>> CalculateDrawdownHistoryAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var dailyBalances = await GetDailyBalancesAsync(accountId, startDate, endDate);
            var drawdownHistory = new List<DrawdownDataPoint>();

            if (dailyBalances.Count < 2)
            {
                return drawdownHistory;
            }

            decimal peak = dailyBalances[0].Balance;

            foreach (var balance in dailyBalances)
            {
                if (balance.Balance > peak)
                {
                    peak = balance.Balance;
                }

                var drawdown = peak != 0 ? ((balance.Balance - peak) / peak) * 100 : 0;

                drawdownHistory.Add(new DrawdownDataPoint
                {
                    Date = balance.Date,
                    Drawdown = drawdown
                });
            }

            return drawdownHistory;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating drawdown history for account {AccountId}", accountId);
            return new List<DrawdownDataPoint>();
        }
    }

    // Helper methods

    private async Task<List<decimal>> GetDailyReturnsAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        // Use weekly balances with historical portfolio values
        var weeklyBalances = await GetDailyBalancesAsync(accountId, startDate, endDate);
        var returns = new List<decimal>();

        for (int i = 1; i < weeklyBalances.Count; i++)
        {
            var previousBalance = weeklyBalances[i - 1].Balance;
            if (previousBalance != 0)
            {
                var weeklyReturn = (weeklyBalances[i].Balance - previousBalance) / previousBalance;
                returns.Add(weeklyReturn);
            }
        }

        return returns;
    }

    private async Task<List<decimal>> GetMarketReturnsAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        // Simplified - would fetch actual market data from FMP API in production
        var prices = await GetPriceHistoryAsync(symbol, startDate, endDate);
        return CalculateReturns(prices);
    }

    private async Task<List<(DateTime Date, decimal Balance)>> GetDailyBalancesAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        // Use weekly snapshots with historical portfolio values
        var balances = new List<(DateTime Date, decimal Balance)>();
        var currentDate = startDate;

        while (currentDate <= endDate)
        {
            var balance = await _performanceService.GetPortfolioValueAsync(accountId, currentDate);
            balances.Add((currentDate, balance));

            currentDate = currentDate.AddDays(7); // Weekly intervals
        }

        // Always include end date
        if (balances.Count == 0 || balances.Last().Date != endDate)
        {
            var finalBalance = await _performanceService.GetPortfolioValueAsync(accountId, endDate);
            balances.Add((endDate, finalBalance));
        }

        return balances;
    }

    private async Task<List<decimal>> GetPriceHistoryAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        var prices = await _context.PriceHistory
            .Where(p => p.Symbol == symbol && p.Date >= startDate && p.Date <= endDate)
            .OrderBy(p => p.Date)
            .Select(p => p.Close)
            .ToListAsync();

        return prices;
    }

    private List<decimal> CalculateReturns(List<decimal> prices)
    {
        var returns = new List<decimal>();

        for (int i = 1; i < prices.Count; i++)
        {
            if (prices[i - 1] != 0)
            {
                var dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
                returns.Add(dailyReturn);
            }
        }

        return returns;
    }
}
