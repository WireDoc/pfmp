using Hangfire;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Services.Spending;

namespace PFMP_API.Jobs;

/// <summary>
/// Wave 14 P1: nightly per-user recompute of spending rollups. Chained after
/// <c>PlaidSyncJob</c> so it sees the freshest cash transactions.
/// Schedule: 10:15 PM ET daily.
/// </summary>
public class SpendingRollupJob
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SpendingRollupJob> _logger;

    public SpendingRollupJob(IServiceProvider serviceProvider, ILogger<SpendingRollupJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
    public async Task RecomputeForAllUsersAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var analytics = scope.ServiceProvider.GetRequiredService<ISpendingAnalyticsService>();
        var heuristic = scope.ServiceProvider.GetRequiredService<IHeuristicRecurringDetector>();
        var anomaly = scope.ServiceProvider.GetRequiredService<IAnomalyDetectionService>();
        var alerts = scope.ServiceProvider.GetRequiredService<ISpendingAlertService>();

        // Only recompute for ACTIVE users with cash/liability data (avoids churn
        // on empty profiles; Wave 26 — deactivated users go quiet).
        var userIds = await db.CashAccounts
            .Select(a => a.UserId)
            .Union(db.LiabilityAccounts.Select(l => l.UserId))
            .Distinct()
            .Where(id => db.Users.Any(u => u.UserId == id && u.IsActive))
            .ToListAsync(cancellationToken);

        _logger.LogInformation("SpendingRollupJob starting for {Count} user(s)", userIds.Count);
        int success = 0, failure = 0;
        foreach (var userId in userIds)
        {
            try
            {
                await analytics.RecomputeRollupsAsync(userId, monthsBack: 12, cancellationToken);
                // P3: detect heuristic recurring streams and category-level anomalies
                // before the alert emit so the alert service sees fresh anomaly rows.
                await heuristic.DetectAsync(userId, cancellationToken);
                await anomaly.DetectAsync(userId, cancellationToken);
                await alerts.GenerateAnomalyAlertsAsync(userId, cancellationToken);
                success++;
            }
            catch (Exception ex)
            {
                failure++;
                _logger.LogError(ex, "SpendingRollupJob failed for user {UserId}", userId);
            }
        }
        _logger.LogInformation("SpendingRollupJob complete: {Success} ok, {Failure} failed", success, failure);
    }
}
