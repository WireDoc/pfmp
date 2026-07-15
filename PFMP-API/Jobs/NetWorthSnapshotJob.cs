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
    private readonly PFMP_API.Services.NetWorth.INetWorthCalculationService _netWorth;

    public NetWorthSnapshotJob(
        ApplicationDbContext context,
        ILogger<NetWorthSnapshotJob> logger,
        PFMP_API.Services.NetWorth.INetWorthCalculationService netWorth)
    {
        _context = context;
        _logger = logger;
        _netWorth = netWorth;
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

            // Upsert today's snapshot per user — if one already exists for today (e.g. from a
            // manual trigger earlier in the day), recalculate and overwrite it with fresh values.
            // Previous behavior skipped if today's row existed, which left stale TSP / asset
            // prices baked into the snapshot when DailyTSP_API posted later than expected.
            var existingByUser = await _context.NetWorthSnapshots
                .Where(s => s.SnapshotDate == today)
                .ToDictionaryAsync(s => s.UserId, cancellationToken);

            int created = 0;
            int updated = 0;
            int errors = 0;

            foreach (var userId in eligibleUsers)
            {
                try
                {
                    var snapshot = await CaptureUserSnapshotAsync(userId, today, cancellationToken);
                    if (snapshot == null) continue;

                    if (existingByUser.TryGetValue(userId, out var existing))
                    {
                        existing.TotalNetWorth = snapshot.TotalNetWorth;
                        existing.InvestmentsTotal = snapshot.InvestmentsTotal;
                        existing.CashTotal = snapshot.CashTotal;
                        existing.RealEstateEquity = snapshot.RealEstateEquity;
                        existing.RetirementTotal = snapshot.RetirementTotal;
                        existing.LiabilitiesTotal = snapshot.LiabilitiesTotal;
                        existing.CreatedAt = DateTime.UtcNow;
                        updated++;
                    }
                    else
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
                "Net worth snapshot job completed. Created: {Created}, Updated: {Updated}, Errors: {Errors}, Duration: {Duration:F2}s",
                created, updated, errors, elapsed.TotalSeconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Net worth snapshot job failed after {Duration:F2}s",
                (DateTime.UtcNow - startTime).TotalSeconds);
            throw; // Let Hangfire retry
        }
    }

    /// <summary>
    /// Capture a single user's net worth snapshot. Wave 26: totals come from
    /// the shared NetWorthCalculationService — the same numbers the dashboard
    /// summary and the financial-profile snapshot report.
    /// </summary>
    public async Task<NetWorthSnapshot?> CaptureUserSnapshotAsync(
        int userId,
        DateOnly? snapshotDate = null,
        CancellationToken cancellationToken = default)
    {
        var date = snapshotDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var breakdown = await _netWorth.ComputeAsync(userId, cancellationToken);

        return new NetWorthSnapshot
        {
            UserId = userId,
            SnapshotDate = date,
            TotalNetWorth = breakdown.NetWorth,
            // Crypto rolled into InvestmentsTotal until a dedicated CryptoTotal column is added.
            InvestmentsTotal = breakdown.Investments + breakdown.Crypto,
            CashTotal = breakdown.Cash,
            RealEstateEquity = breakdown.PropertyEquity, // net of ALL mortgage debt for display
            RetirementTotal = breakdown.Tsp,
            LiabilitiesTotal = breakdown.TotalLiabilities,
            CreatedAt = DateTime.UtcNow
        };
    }

    // internal so AIIntelligenceService can apply the same live-pricing logic when rendering
    // the TSP block — keeps the AI prompt's TSP total in lock-step with the snapshot job and
    // the dashboard. Without this, the prompt would read frozen-as-of-statement-upload values
    // from TspLifecyclePositions.CurrentMarketValue and drift by thousands of dollars vs.
    // the snapshot, triggering spurious DATA INCONSISTENCY flags from the AI.
    internal static decimal? GetCachedTspFundPrice(TSPFundPrice cachedPrices, string fundCode)
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
