using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P3: per-category IQR anomaly detection. For each Plaid primary
/// category, computes a rolling 6-month median + interquartile range over the
/// user's outflow transactions; flags any tx whose deviation from median
/// exceeds 2 × IQR. Suppresses categories with fewer than 6 transactions
/// in the trailing window (signal too thin to be trustworthy). Writes
/// <see cref="SpendingAnomaly"/> rows that the dashboard + alert service consume.
/// </summary>
public interface IAnomalyDetectionService
{
    /// <summary>Run detection across the user's last 6 months of transactions.</summary>
    Task<DetectionResult> DetectAsync(int userId, CancellationToken ct = default);
}

public record DetectionResult(int CategoriesEvaluated, int CategoriesSuppressed, int AnomaliesAdded);

public class AnomalyDetectionService : IAnomalyDetectionService
{
    private const int MinTransactionsPerCategory = 6;
    private const decimal DeviationThreshold = 2m; // (|amount - median| / IQR) > 2

    private readonly ApplicationDbContext _db;
    private readonly ISpendingAnalyticsService _analytics;
    private readonly ICategoryRuleService _ruleService;
    private readonly SpendingOptions _options;
    private readonly ILogger<AnomalyDetectionService> _logger;

    public AnomalyDetectionService(
        ApplicationDbContext db,
        ISpendingAnalyticsService analytics,
        ICategoryRuleService ruleService,
        Microsoft.Extensions.Options.IOptions<SpendingOptions> options,
        ILogger<AnomalyDetectionService> logger)
    {
        _db = db;
        _analytics = analytics;
        _ruleService = ruleService;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<DetectionResult> DetectAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddMonths(-6);

        // Pull the user's cash transactions in the trailing 6-month window.
        // Resolved via CashAccount.UserId / LiabilityAccount.UserId because
        // CashTransaction has no UserId column.
        var cashAcctIds = await _db.CashAccounts.Where(a => a.UserId == userId)
            .Select(a => a.CashAccountId).ToListAsync(ct);
        var liabilityAcctIds = await _db.LiabilityAccounts.Where(l => l.UserId == userId)
            .Select(l => l.LiabilityAccountId).ToListAsync(ct);

        var txs = await _db.CashTransactions
            .Where(t => t.TransactionDate >= windowStart && t.TransactionDate < now)
            .Where(t =>
                (t.CashAccountId != null && cashAcctIds.Contains(t.CashAccountId.Value)) ||
                (t.LiabilityAccountId != null && liabilityAcctIds.Contains(t.LiabilityAccountId.Value)))
            .ToListAsync(ct);

        // Apply user rules + filter to outflows (negative amount), exclude internal transfers.
        var rules = await _ruleService.ListAsync(userId, ct);
        var spendingTxs = txs
            .Where(t => t.Amount < 0)
            .Where(t => !IsInternalTransfer(t))
            .Select(t =>
            {
                var (primary, _) = _ruleService.Resolve(t, rules);
                return new { Tx = t, Primary = primary, AbsAmount = -t.Amount };
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Primary) && !string.Equals(x.Primary, "UNCATEGORIZED", StringComparison.OrdinalIgnoreCase))
            .ToList();

        // Existing non-dismissed anomalies for this user — used to avoid duplicates.
        var existingAnomalyTxIds = await _db.SpendingAnomalies
            .Where(a => a.UserId == userId && !a.Dismissed)
            .Select(a => a.CashTransactionId)
            .ToListAsync(ct);
        var existingSet = new HashSet<int>(existingAnomalyTxIds);

        int categoriesEvaluated = 0;
        int categoriesSuppressed = 0;
        int anomaliesAdded = 0;

        var groups = spendingTxs.GroupBy(x => x.Primary!);
        foreach (var group in groups)
        {
            var amounts = group.Select(x => x.AbsAmount).ToList();
            if (amounts.Count < MinTransactionsPerCategory)
            {
                categoriesSuppressed++;
                continue;
            }
            categoriesEvaluated++;

            var sorted = amounts.OrderBy(a => a).ToList();
            var median = Median(sorted);
            var q1 = Quartile(sorted, 0.25);
            var q3 = Quartile(sorted, 0.75);
            var iqr = q3 - q1;
            // Degenerate spread (all-same values, e.g. fixed subscription) — skip.
            if (iqr <= 0) continue;

            foreach (var item in group)
            {
                var deviation = Math.Abs(item.AbsAmount - median) / iqr;
                if (deviation <= DeviationThreshold) continue;
                if (existingSet.Contains(item.Tx.CashTransactionId)) continue;

                _db.SpendingAnomalies.Add(new SpendingAnomaly
                {
                    UserId = userId,
                    CashTransactionId = item.Tx.CashTransactionId,
                    PlaidPrimaryCategory = group.Key,
                    Amount = item.AbsAmount,
                    CategoryMedian = median,
                    CategoryIqr = iqr,
                    DeviationMultiple = deviation,
                    DetectedAt = now,
                    Dismissed = false,
                });
                existingSet.Add(item.Tx.CashTransactionId);
                anomaliesAdded++;
            }
        }

        if (anomaliesAdded > 0)
        {
            await _db.SaveChangesAsync(ct);
        }

        _logger.LogInformation(
            "AnomalyDetectionService for user {UserId}: evaluated {Eval} categories, suppressed {Suppressed}, added {Added} anomalies",
            userId, categoriesEvaluated, categoriesSuppressed, anomaliesAdded);

        return new DetectionResult(categoriesEvaluated, categoriesSuppressed, anomaliesAdded);
    }

    private bool IsInternalTransfer(CashTransaction tx)
    {
        if (tx.PlaidCategoryDetailed is { Length: > 0 } pfc
            && _options.InternalTransferCategories.Contains(pfc, StringComparer.OrdinalIgnoreCase)) return true;
        if (tx.Category is { Length: > 0 } cat
            && _options.InternalTransferPfmpCategories.Contains(cat, StringComparer.OrdinalIgnoreCase)) return true;
        if (tx.Description is { Length: > 0 } desc)
        {
            foreach (var prefix in _options.InternalTransferDescriptionPrefixes)
            {
                if (desc.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return true;
            }
        }
        return false;
    }

    /// <summary>Median of a pre-sorted list. Throws if empty.</summary>
    internal static decimal Median(IReadOnlyList<decimal> sorted)
    {
        int n = sorted.Count;
        if (n == 0) throw new InvalidOperationException("Cannot compute median of empty list");
        if (n % 2 == 1) return sorted[n / 2];
        return (sorted[(n / 2) - 1] + sorted[n / 2]) / 2m;
    }

    /// <summary>
    /// Linear-interpolation quartile (R-7 / Excel-style) on a pre-sorted list.
    /// </summary>
    internal static decimal Quartile(IReadOnlyList<decimal> sorted, double q)
    {
        if (sorted.Count == 0) throw new InvalidOperationException("Cannot compute quartile of empty list");
        if (sorted.Count == 1) return sorted[0];
        var pos = q * (sorted.Count - 1);
        var lower = (int)Math.Floor(pos);
        var upper = (int)Math.Ceiling(pos);
        if (lower == upper) return sorted[lower];
        var weight = (decimal)(pos - lower);
        return sorted[lower] * (1m - weight) + sorted[upper] * weight;
    }
}
