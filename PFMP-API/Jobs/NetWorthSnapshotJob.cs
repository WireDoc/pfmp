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
    /// </summary>
    public async Task<NetWorthSnapshot?> CaptureUserSnapshotAsync(
        int userId, 
        DateOnly? snapshotDate = null,
        CancellationToken cancellationToken = default)
    {
        var date = snapshotDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Get all user accounts with holdings
        var accounts = await _context.Accounts
            .Include(a => a.Holdings)
            .Where(a => a.UserId == userId)
            .Where(a => a.IsActive)
            .ToListAsync(cancellationToken);

        // Get real estate properties
        var properties = await _context.RealEstateProperties
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        // Calculate totals by category
        decimal investmentsTotal = 0;
        decimal cashTotal = 0;
        decimal retirementTotal = 0;
        decimal liabilitiesTotal = 0;

        foreach (var account in accounts)
        {
            var accountValue = account.Holdings.Sum(h => h.Quantity * h.CurrentPrice);
            if (accountValue == 0)
            {
                accountValue = account.CurrentBalance;
            }

            switch (account.Category)
            {
                case AccountCategory.Cash:
                    cashTotal += accountValue;
                    break;
                case AccountCategory.TaxDeferred:
                case AccountCategory.TaxFree:
                    retirementTotal += accountValue;
                    break;
                case AccountCategory.Taxable:
                case AccountCategory.TaxAdvantaged:
                case AccountCategory.Cryptocurrency:
                case AccountCategory.Alternative:
                    investmentsTotal += accountValue;
                    break;
                default:
                    investmentsTotal += accountValue;
                    break;
            }
        }

        // Calculate real estate equity (value - mortgage)
        decimal realEstateEquity = properties.Sum(p => 
            p.CurrentMarketValue - p.MortgageBalance);

        // Get liabilities from liability accounts
        var liabilities = await _context.LiabilityAccounts
            .Where(l => l.UserId == userId)
            .SumAsync(l => l.CurrentBalance, cancellationToken);
        liabilitiesTotal = liabilities;

        // Calculate total net worth
        var totalNetWorth = investmentsTotal + cashTotal + realEstateEquity + retirementTotal - liabilitiesTotal;

        return new NetWorthSnapshot
        {
            UserId = userId,
            SnapshotDate = date,
            TotalNetWorth = totalNetWorth,
            InvestmentsTotal = investmentsTotal,
            CashTotal = cashTotal,
            RealEstateEquity = realEstateEquity,
            RetirementTotal = retirementTotal,
            LiabilitiesTotal = liabilitiesTotal,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Manually trigger snapshot for a specific user.
    /// </summary>
    public async Task CaptureSnapshotForUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Check if already exists
        var existing = await _context.NetWorthSnapshots
            .AnyAsync(s => s.UserId == userId && s.SnapshotDate == today, cancellationToken);

        if (existing)
        {
            _logger.LogInformation("Snapshot already exists for user {UserId} on {Date}", userId, today);
            return;
        }

        var snapshot = await CaptureUserSnapshotAsync(userId, today, cancellationToken);
        if (snapshot != null)
        {
            _context.NetWorthSnapshots.Add(snapshot);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Created snapshot for user {UserId}: Net Worth = {NetWorth:C}", 
                userId, snapshot.TotalNetWorth);
        }
    }
}
