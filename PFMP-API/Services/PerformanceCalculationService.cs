using PFMP_API.Models;
using PFMP_API.Models.Analytics;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating portfolio performance metrics (TWR, MWR, Sharpe ratio)
/// </summary>
public class PerformanceCalculationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PerformanceCalculationService> _logger;

    public PerformanceCalculationService(
        ApplicationDbContext context,
        ILogger<PerformanceCalculationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Calculate Time-Weighted Return (TWR) for an account
    /// </summary>
    public async Task<decimal> CalculateTWRAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            // Get all transactions in the period
            var transactions = await _context.Transactions
                .Where(t => t.AccountId == accountId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            // Get holdings for price history
            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .ToListAsync();

            if (!holdings.Any())
            {
                return 0;
            }

            // Reconstruct daily balances
            var dailyBalances = await ReconstructDailyBalancesAsync(accountId, holdings, transactions, startDate, endDate);

            if (dailyBalances.Count < 2)
            {
                return 0;
            }

            // Calculate TWR
            decimal twrProduct = 1.0m;

            for (int i = 0; i < dailyBalances.Count - 1; i++)
            {
                var startBalance = dailyBalances[i].Balance;
                var endBalance = dailyBalances[i + 1].Balance;

                if (startBalance == 0)
                {
                    continue;
                }

                // Find cash flows between these dates
                var cashFlows = transactions
                    .Where(t => t.TransactionDate > dailyBalances[i].Date && t.TransactionDate <= dailyBalances[i + 1].Date)
                    .Sum(t => GetCashFlowAmount(t));

                // Period return = (Ending - Beginning - Cash Flows) / Beginning
                var periodReturn = (endBalance - startBalance - cashFlows) / startBalance;

                twrProduct *= (1 + periodReturn);
            }

            return (twrProduct - 1) * 100; // Convert to percentage
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating TWR for account {AccountId}", accountId);
            throw;
        }
    }

    /// <summary>
    /// Calculate Money-Weighted Return (IRR) for an account
    /// </summary>
    public async Task<decimal> CalculateMWRAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            // Get all cash flows (deposits, withdrawals)
            var transactions = await _context.Transactions
                .Where(t => t.AccountId == accountId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            var cashFlows = new List<(DateTime Date, decimal Amount)>();

            // Initial investment (negative cash flow)
            var initialValue = await GetPortfolioValueAsync(accountId, startDate);
            if (initialValue > 0)
            {
                cashFlows.Add((startDate, -initialValue));
            }

            // Add transaction cash flows
            foreach (var txn in transactions)
            {
                var amount = GetCashFlowAmount(txn);
                if (amount != 0)
                {
                    cashFlows.Add((txn.TransactionDate, -amount)); // Negative because deposits are outflows from investor perspective
                }
            }

            // Final value (positive cash flow)
            var finalValue = await GetPortfolioValueAsync(accountId, endDate);
            cashFlows.Add((endDate, finalValue));

            // Calculate IRR using Newton-Raphson method
            return CalculateIRR(cashFlows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating MWR for account {AccountId}", accountId);
            throw;
        }
    }

    /// <summary>
    /// Calculate Sharpe Ratio (risk-adjusted return)
    /// </summary>
    public decimal CalculateSharpeRatio(decimal portfolioReturn, decimal volatility, decimal riskFreeRate = 0.043m)
    {
        // Use 10-year Treasury yield as risk-free rate (default 4.3%)
        if (volatility == 0)
        {
            return 0;
        }

        var excessReturn = portfolioReturn - riskFreeRate;
        return excessReturn / volatility;
    }

    /// <summary>
    /// Calculate annualized volatility (standard deviation of returns)
    /// </summary>
    public async Task<decimal> CalculateVolatilityAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var dailyReturns = await CalculateDailyReturnsAsync(accountId, startDate, endDate);

            if (dailyReturns.Count < 2)
            {
                return 0;
            }

            var mean = dailyReturns.Average();
            var sumOfSquaredDifferences = dailyReturns.Sum(r => (decimal)Math.Pow((double)(r - mean), 2));
            var variance = sumOfSquaredDifferences / (dailyReturns.Count - 1);
            var standardDeviation = (decimal)Math.Sqrt((double)variance);

            // Annualize using sqrt(252) trading days
            return standardDeviation * (decimal)Math.Sqrt(252) * 100;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating volatility for account {AccountId}", accountId);
            throw;
        }
    }

    /// <summary>
    /// Calculate daily returns for volatility calculation
    /// </summary>
    private async Task<List<decimal>> CalculateDailyReturnsAsync(int accountId, DateTime startDate, DateTime endDate)
    {
        var transactions = await _context.Transactions
            .Where(t => t.AccountId == accountId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
            .ToListAsync();

        var holdings = await _context.Holdings
            .Where(h => h.AccountId == accountId)
            .ToListAsync();

        var dailyBalances = await ReconstructDailyBalancesAsync(accountId, holdings, transactions, startDate, endDate);

        var returns = new List<decimal>();

        for (int i = 1; i < dailyBalances.Count; i++)
        {
            var previousBalance = dailyBalances[i - 1].Balance;
            var currentBalance = dailyBalances[i].Balance;

            if (previousBalance == 0)
            {
                continue;
            }

            // Find cash flows on this day
            var cashFlows = transactions
                .Where(t => t.TransactionDate.Date == dailyBalances[i].Date.Date)
                .Sum(t => GetCashFlowAmount(t));

            // Daily return = (Current - Previous - Cash Flows) / Previous
            var dailyReturn = (currentBalance - previousBalance - cashFlows) / previousBalance;
            returns.Add(dailyReturn);
        }

        return returns;
    }

    /// <summary>
    /// Reconstruct daily portfolio balances from transactions and prices
    /// </summary>
    private async Task<List<(DateTime Date, decimal Balance)>> ReconstructDailyBalancesAsync(
        int accountId,
        List<Holding> holdings,
        List<Transaction> transactions,
        DateTime startDate,
        DateTime endDate)
    {
        var dailyBalances = new List<(DateTime Date, decimal Balance)>();

        // For now, use monthly snapshots to avoid performance issues
        // In production, implement more sophisticated daily reconstruction
        var currentDate = startDate;

        while (currentDate <= endDate)
        {
            var balance = await GetPortfolioValueAsync(accountId, currentDate);
            dailyBalances.Add((currentDate, balance));

            currentDate = currentDate.AddMonths(1);
        }

        // Always include end date
        if (dailyBalances.Last().Date != endDate)
        {
            var finalBalance = await GetPortfolioValueAsync(accountId, endDate);
            dailyBalances.Add((endDate, finalBalance));
        }

        return dailyBalances;
    }

    /// <summary>
    /// Get portfolio value at a specific date
    /// </summary>
    private async Task<decimal> GetPortfolioValueAsync(int accountId, DateTime date)
    {
        var holdings = await _context.Holdings
            .Where(h => h.AccountId == accountId)
            .ToListAsync();

        decimal totalValue = 0;

        foreach (var holding in holdings)
        {
            // Use current price as approximation
            // In production, fetch historical price for the specific date
            totalValue += holding.Quantity * holding.CurrentPrice;
        }

        return totalValue;
    }

    /// <summary>
    /// Get cash flow amount from a transaction (deposits are positive, withdrawals are negative)
    /// </summary>
    private decimal GetCashFlowAmount(Transaction transaction)
    {
        return transaction.TransactionType.ToLower() switch
        {
            "buy" => transaction.Amount,
            "sell" => -transaction.Amount,
            "dividend" => -transaction.Amount, // Dividend is cash inflow
            "deposit" => transaction.Amount,
            "withdrawal" => -transaction.Amount,
            _ => 0
        };
    }

    /// <summary>
    /// Calculate Internal Rate of Return using Newton-Raphson method
    /// </summary>
    private decimal CalculateIRR(List<(DateTime Date, decimal Amount)> cashFlows)
    {
        if (cashFlows.Count < 2)
        {
            return 0;
        }

        // Initial guess: 10% annual return
        decimal irr = 0.10m;
        int maxIterations = 100;
        decimal tolerance = 0.0001m;

        var baseDate = cashFlows.First().Date;

        for (int i = 0; i < maxIterations; i++)
        {
            decimal npv = 0;
            decimal dnpv = 0;

            foreach (var cf in cashFlows)
            {
                var years = (decimal)(cf.Date - baseDate).TotalDays / 365.25m;
                var discountFactor = (decimal)Math.Pow((double)(1 + irr), (double)years);

                npv += cf.Amount / discountFactor;
                dnpv -= years * cf.Amount / discountFactor / (1 + irr);
            }

            if (Math.Abs(npv) < tolerance)
            {
                return irr * 100; // Convert to percentage
            }

            if (dnpv == 0)
            {
                break;
            }

            var irrNew = irr - (npv / dnpv);

            if (Math.Abs(irrNew - irr) < tolerance)
            {
                return irrNew * 100;
            }

            irr = irrNew;

            // Prevent extreme values
            if (irr < -0.99m || irr > 10m)
            {
                return 0;
            }
        }

        _logger.LogWarning("IRR calculation did not converge");
        return 0;
    }
}
