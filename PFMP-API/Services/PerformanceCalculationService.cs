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
            var transactions = await _context.Transactions
                .Where(t => t.AccountId == accountId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                .ToListAsync();

            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .ToListAsync();

            var weeklyBalances = await ReconstructDailyBalancesAsync(accountId, holdings, transactions, startDate, endDate);

            if (weeklyBalances.Count < 2)
            {
                return 0;
            }

            var returns = new List<decimal>();

            for (int i = 1; i < weeklyBalances.Count; i++)
            {
                var previousBalance = weeklyBalances[i - 1].Balance;
                var currentBalance = weeklyBalances[i].Balance;

                if (previousBalance == 0)
                {
                    continue;
                }

                // Find cash flows between these dates
                var cashFlows = transactions
                    .Where(t => t.TransactionDate > weeklyBalances[i - 1].Date && 
                               t.TransactionDate <= weeklyBalances[i].Date)
                    .Sum(t => GetCashFlowAmount(t));

                // Period return = (Current - Previous - Cash Flows) / Previous
                var periodReturn = (currentBalance - previousBalance - cashFlows) / previousBalance;
                returns.Add(periodReturn);
            }

            if (returns.Count < 2)
            {
                return 0;
            }

            var mean = returns.Average();
            var sumOfSquaredDifferences = returns.Sum(r => (decimal)Math.Pow((double)(r - mean), 2));
            var variance = sumOfSquaredDifferences / (returns.Count - 1);
            var standardDeviation = (decimal)Math.Sqrt((double)variance);

            // Annualize weekly returns using sqrt(52) weeks per year
            return standardDeviation * (decimal)Math.Sqrt(52) * 100;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating volatility for account {AccountId}", accountId);
            throw;
        }
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

        // Use weekly snapshots for better risk metrics while maintaining performance
        var currentDate = startDate;

        while (currentDate <= endDate)
        {
            var balance = await GetPortfolioValueAsync(accountId, currentDate);
            dailyBalances.Add((currentDate, balance));

            currentDate = currentDate.AddDays(7); // Weekly intervals
        }

        // Always include end date
        if (dailyBalances.Count == 0 || dailyBalances.Last().Date != endDate)
        {
            var finalBalance = await GetPortfolioValueAsync(accountId, endDate);
            dailyBalances.Add((endDate, finalBalance));
        }

        return dailyBalances;
    }

    /// <summary>
    /// Get portfolio value at a specific date using historical prices
    /// </summary>
    public async Task<decimal> GetPortfolioValueAsync(int accountId, DateTime date)
    {
        var holdings = await _context.Holdings
            .Where(h => h.AccountId == accountId)
            .ToListAsync();

        decimal totalValue = 0;

        foreach (var holding in holdings)
        {
            // Skip holdings without complete transaction history
            // (e.g., Plaid synced accounts that only have partial history)
            if (!await HasCompleteHistoryAsync(holding.HoldingId))
            {
                continue;
            }

            // Get quantity held at this date by reconstructing transaction history
            var quantityAtDate = await GetQuantityAtDateAsync(holding.HoldingId, date);

            if (quantityAtDate == 0)
            {
                continue;
            }

            // Fetch historical price for this date
            var price = await GetPriceAtDateAsync(holding.Symbol, date);

            if (price == 0)
            {
                // Fallback to current price if historical not available
                price = holding.CurrentPrice;
            }

            totalValue += quantityAtDate * price;
        }

        return totalValue;
    }

    /// <summary>
    /// Check if a holding has complete transaction history for performance calculations.
    /// Returns true if:
    /// - Has INITIAL_BALANCE transaction, OR
    /// - Transaction quantities reconcile to current holding quantity (±5% tolerance)
    /// </summary>
    private async Task<bool> HasCompleteHistoryAsync(int holdingId)
    {
        // Check for INITIAL_BALANCE transaction - always valid
        var hasInitialBalance = await _context.Transactions
            .AnyAsync(t => t.HoldingId == holdingId && 
                          t.TransactionType.ToUpper() == "INITIAL_BALANCE");
        
        if (hasInitialBalance)
        {
            return true;
        }

        // Get the holding
        var holding = await _context.Holdings.FindAsync(holdingId);
        if (holding == null)
        {
            return false;
        }

        // Get all transactions for this holding
        var transactions = await _context.Transactions
            .Where(t => t.HoldingId == holdingId)
            .ToListAsync();

        if (!transactions.Any())
        {
            // No transactions - can't verify history
            return false;
        }

        // Calculate quantity from transactions
        decimal calculatedQuantity = 0;
        foreach (var txn in transactions)
        {
            var txType = txn.TransactionType?.ToUpperInvariant() ?? "";
            switch (txType)
            {
                case "BUY":
                case "TRANSFER_IN":
                    calculatedQuantity += txn.Quantity ?? 0;
                    break;
                case "SELL":
                case "TRANSFER_OUT":
                    calculatedQuantity -= Math.Abs(txn.Quantity ?? 0);
                    break;
                case "DIVIDEND":
                    if (txn.IsDividendReinvestment)
                    {
                        calculatedQuantity += txn.Quantity ?? 0;
                    }
                    break;
            }
        }

        // Compare to current holding quantity with 5% tolerance
        // (small discrepancies can occur due to rounding, stock splits, etc.)
        var currentQuantity = holding.Quantity;
        if (currentQuantity == 0)
        {
            // Position is closed - complete if calculated is also zero
            return Math.Abs(calculatedQuantity) < 0.01m;
        }

        var difference = Math.Abs(calculatedQuantity - currentQuantity);
        var percentDifference = difference / currentQuantity;
        
        var isReconciled = percentDifference <= 0.05m; // 5% tolerance
        
        if (!isReconciled)
        {
            _logger.LogDebug(
                "Holding {HoldingId} ({Symbol}) has quantity mismatch: calculated={Calculated}, current={Current}, diff={Diff}%",
                holdingId, holding.Symbol, calculatedQuantity, currentQuantity, percentDifference * 100);
        }

        return isReconciled;
    }

    /// <summary>
    /// Get quantity of a holding at a specific date by summing transactions up to that date
    /// </summary>
    private async Task<decimal> GetQuantityAtDateAsync(int holdingId, DateTime date)
    {
        var transactions = await _context.Transactions
            .Where(t => t.HoldingId == holdingId && t.TransactionDate <= date)
            .ToListAsync();

        decimal quantity = 0;

        foreach (var txn in transactions)
        {
            // Use case-insensitive comparison
            var txType = txn.TransactionType?.ToUpperInvariant() ?? "";
            
            switch (txType)
            {
                case "BUY":
                case "INITIAL_BALANCE":
                    quantity += txn.Quantity ?? 0;
                    break;
                case "SELL":
                    quantity -= Math.Abs(txn.Quantity ?? 0); // Plaid sends negative qty for sells
                    break;
                case "WITHDRAWAL":
                    quantity -= txn.Quantity ?? 0;
                    break;
                // Dividends don't affect quantity unless reinvested
                case "DIVIDEND":
                    if (txn.IsDividendReinvestment)
                    {
                        quantity += txn.Quantity ?? 0;
                    }
                    break;
                // DEPOSIT, FEE, INTEREST, STAKING_REWARD - don't affect share quantity for investments
                // (DEPOSIT is cash, not shares)
            }
        }

        return Math.Max(0, quantity);
    }

    /// <summary>
    /// Get historical price for a symbol at or before a specific date
    /// </summary>
    private async Task<decimal> GetPriceAtDateAsync(string symbol, DateTime date)
    {
        // Find the closest price on or before the requested date
        var price = await _context.PriceHistory
            .Where(p => p.Symbol == symbol && p.Date <= date)
            .OrderByDescending(p => p.Date)
            .Select(p => p.Close)
            .FirstOrDefaultAsync();

        return price;
    }

    /// <summary>
    /// Get cash flow amount from a transaction (deposits are positive, withdrawals are negative)
    /// </summary>
    private decimal GetCashFlowAmount(Transaction transaction)
    {
        var txType = transaction.TransactionType?.ToUpperInvariant() ?? "";
        var amount = Math.Abs(transaction.Amount);
        
        return txType switch
        {
            "BUY" => amount,
            "INITIAL_BALANCE" => amount,
            "SELL" => -amount,
            "DIVIDEND" => -amount, // Dividend is cash inflow
            "DEPOSIT" => amount,
            "WITHDRAWAL" => -amount,
            _ => 0
        };
    }

    /// <summary>
    /// Get historical portfolio values for charting
    /// </summary>
    public async Task<List<(DateTime Date, decimal PortfolioValue)>> GetHistoricalPerformanceAsync(
        int accountId, 
        DateTime startDate, 
        DateTime endDate)
    {
        var holdings = await _context.Holdings
            .Where(h => h.AccountId == accountId)
            .ToListAsync();

        if (!holdings.Any())
        {
            return new List<(DateTime, decimal)>();
        }

        var dataPoints = new List<(DateTime Date, decimal PortfolioValue)>();

        // Generate weekly data points to balance granularity vs performance
        var currentDate = startDate;
        while (currentDate <= endDate)
        {
            var value = await GetPortfolioValueAsync(accountId, currentDate);
            dataPoints.Add((currentDate, value));

            currentDate = currentDate.AddDays(7); // Weekly intervals
        }

        // Always include the end date
        if (dataPoints.Count == 0 || dataPoints.Last().Date != endDate)
        {
            var finalValue = await GetPortfolioValueAsync(accountId, endDate);
            dataPoints.Add((endDate, finalValue));
        }

        return dataPoints;
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
