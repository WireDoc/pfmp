using Hangfire;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Jobs;

/// <summary>
/// Background job to capture daily net worth snapshots at 11:30 PM ET.
/// Wave 10: Background Jobs & Automation
/// </summary>
public class NetWorthSnapshotJob
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NetWorthSnapshotJob> _logger;

    public NetWorthSnapshotJob(
        ApplicationDbContext context,
        ILogger<NetWorthSnapshotJob> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Capture net worth snapshots for all eligible users.
    /// Called by Hangfire on schedule or triggered manually.
    /// </summary>
    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
    [Queue("snapshots")]
    public async Task CaptureAllUserSnapshotsAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting daily net worth snapshot job");
        var startTime = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        try
        {
            // Get all eligible users (not test accounts)
            var eligibleUsers = await _context.Users
                .Where(u => !u.IsTestAccount)
                .Where(u => u.IsActive)
                .Select(u => u.UserId)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Found {UserCount} eligible users for snapshot", eligibleUsers.Count);

            if (eligibleUsers.Count == 0)
            {
                _logger.LogInformation("No eligible users to process. Job complete.");
                return;
            }

            // Check for existing snapshots today (idempotent)
            var existingSnapshots = await _context.NetWorthSnapshots
                .Where(s => s.SnapshotDate == today)
                .Select(s => s.UserId)
                .ToHashSetAsync(cancellationToken);

            int created = 0;
            int skipped = 0;
            int errors = 0;

            foreach (var userId in eligibleUsers)
            {
                if (existingSnapshots.Contains(userId))
                {
                    skipped++;
                    continue;
                }

                try
                {
                    var snapshot = await CaptureUserSnapshotAsync(userId, today, cancellationToken);
                    if (snapshot != null)
                    {
                        _context.NetWorthSnapshots.Add(snapshot);
                        created++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to capture snapshot for user {UserId}", userId);
                    errors++;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            var elapsed = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Net worth snapshot job completed. Created: {Created}, Skipped: {Skipped}, Errors: {Errors}, Duration: {Duration:F2}s",
                created, skipped, errors, elapsed.TotalSeconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Net worth snapshot job failed after {Duration:F2}s",
                (DateTime.UtcNow - startTime).TotalSeconds);
            throw; // Let Hangfire retry
        }
    }

    /// <summary>
    /// Capture a single user's net worth snapshot.
    /// Matches the calculation logic in DashboardController.GetDashboardSummary()
    /// </summary>
    public async Task<NetWorthSnapshot?> CaptureUserSnapshotAsync(
        int userId, 
        DateOnly? snapshotDate = null,
        CancellationToken cancellationToken = default)
    {
        var date = snapshotDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Get investment/retirement accounts from Accounts table (exclude cash types - they use CashAccounts table)
        var accounts = await _context.Accounts
            .Include(a => a.Holdings)
            .Where(a => a.UserId == userId)
            .Where(a => a.IsActive)
            .Where(a => a.AccountType != AccountType.Checking &&
                       a.AccountType != AccountType.Savings &&
                       a.AccountType != AccountType.MoneyMarket &&
                       a.AccountType != AccountType.CertificateOfDeposit)
            .ToListAsync(cancellationToken);

        // Get cash accounts from separate CashAccounts table
        var cashAccounts = await _context.CashAccounts
            .Where(ca => ca.UserId == userId)
            .ToListAsync(cancellationToken);

        // Get TSP positions
        var tspPositions = await _context.TspLifecyclePositions
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        // Get real estate properties from Properties table (PropertyProfile)
        var properties = await _context.Properties
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        // Get liabilities
        var liabilities = await _context.LiabilityAccounts
            .Where(l => l.UserId == userId)
            .ToListAsync(cancellationToken);

        // Calculate totals matching Dashboard logic exactly
        // Dashboard uses CurrentBalance directly for investments, not holdings calculation
        decimal cashTotal = cashAccounts.Sum(a => a.Balance);
        
        // Dashboard filters for specific investment account types and uses CurrentBalance
        var investmentAccounts = accounts.Where(a => 
            a.AccountType == AccountType.Brokerage || 
            a.AccountType == AccountType.RetirementAccountIRA || 
            a.AccountType == AccountType.RetirementAccount401k || 
            a.AccountType == AccountType.RetirementAccountRoth ||
            a.AccountType == AccountType.HSA).ToList();
        
        decimal investmentsTotal = investmentAccounts.Sum(a => a.CurrentBalance);

        // Calculate TSP with cached prices (matching Dashboard)
        decimal tspTotal = 0;
        if (tspPositions.Any(p => p.Units > 0))
        {
            var cachedPrices = await _context.TSPFundPrices
                .OrderByDescending(p => p.PriceDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (cachedPrices != null)
            {
                foreach (var position in tspPositions.Where(p => p.Units > 0))
                {
                    var price = GetCachedTspFundPrice(cachedPrices, position.FundCode);
                    if (price.HasValue)
                    {
                        tspTotal += position.Units * price.Value;
                    }
                }
            }
        }

        // Real estate value (full value, not equity - matches Dashboard)
        decimal realEstateValue = properties.Sum(p => p.EstimatedValue);

        // Calculate liabilities (standalone + mortgage balances from properties)
        // Matches Dashboard: liabilities.Sum(l.CurrentBalance) + properties.Sum(p.MortgageBalance ?? 0)
        decimal liabilitiesTotal = liabilities.Sum(l => l.CurrentBalance);
        decimal mortgageTotal = properties.Sum(p => p.MortgageBalance ?? 0);
        liabilitiesTotal += mortgageTotal;

        // Calculate total assets exactly like Dashboard:
        // totalAssets = totalCash + totalInvestments + totalTsp + totalProperties
        decimal totalAssets = cashTotal + investmentsTotal + tspTotal + realEstateValue;
        
        // Net worth = assets - liabilities (Dashboard formula)
        var totalNetWorth = totalAssets - liabilitiesTotal;

        return new NetWorthSnapshot
        {
            UserId = userId,
            SnapshotDate = date,
            TotalNetWorth = totalNetWorth,
            InvestmentsTotal = investmentsTotal, // Brokerage + IRA/401k/Roth/HSA
            CashTotal = cashTotal,
            RealEstateEquity = realEstateValue - mortgageTotal, // Store net equity for display
            RetirementTotal = tspTotal, // TSP (calculated with live prices)
            LiabilitiesTotal = liabilitiesTotal,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static decimal? GetCachedTspFundPrice(TSPFundPrice cachedPrices, string fundCode)
    {
        var code = fundCode.Trim().ToUpperInvariant();
        
        return code switch
        {
            "G" => cachedPrices.GFundPrice,
            "F" => cachedPrices.FFundPrice,
            "C" => cachedPrices.CFundPrice,
            "S" => cachedPrices.SFundPrice,
            "I" => cachedPrices.IFundPrice,
            "L-INCOME" or "LINCOME" => cachedPrices.LIncomeFundPrice,
            "L2030" => cachedPrices.L2030FundPrice,
            "L2035" => cachedPrices.L2035FundPrice,
            "L2040" => cachedPrices.L2040FundPrice,
            "L2045" => cachedPrices.L2045FundPrice,
            "L2050" => cachedPrices.L2050FundPrice,
            "L2055" => cachedPrices.L2055FundPrice,
            "L2060" => cachedPrices.L2060FundPrice,
            "L2065" => cachedPrices.L2065FundPrice,
            "L2070" => cachedPrices.L2070FundPrice,
            "L2075" => cachedPrices.L2075FundPrice,
            _ => null
        };
    }

    /// <summary>
    /// Manually trigger snapshot for a specific user.
    /// </summary>
    public async Task CaptureSnapshotForUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Check if already exists - if so, update it instead
        var existing = await _context.NetWorthSnapshots
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SnapshotDate == today, cancellationToken);

        var snapshot = await CaptureUserSnapshotAsync(userId, today, cancellationToken);
        if (snapshot == null) return;

        if (existing != null)
        {
            // Update existing snapshot
            existing.TotalNetWorth = snapshot.TotalNetWorth;
            existing.InvestmentsTotal = snapshot.InvestmentsTotal;
            existing.CashTotal = snapshot.CashTotal;
            existing.RealEstateEquity = snapshot.RealEstateEquity;
            existing.RetirementTotal = snapshot.RetirementTotal;
            existing.LiabilitiesTotal = snapshot.LiabilitiesTotal;
            existing.CreatedAt = DateTime.UtcNow;
            _logger.LogInformation("Updated snapshot for user {UserId}: Net Worth = {NetWorth:C}", 
                userId, existing.TotalNetWorth);
        }
        else
        {
            _context.NetWorthSnapshots.Add(snapshot);
            _logger.LogInformation("Created snapshot for user {UserId}: Net Worth = {NetWorth:C}", 
                userId, snapshot.TotalNetWorth);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
