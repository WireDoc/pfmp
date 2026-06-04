using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P3: detects recurring transaction streams from cash-transaction
/// history when Plaid Recurring is unavailable (non-Plaid accounts) or hasn't
/// matured a given stream yet. Clusters transactions by merchant + amount
/// tolerance + cadence. Plaid wins on conflict — heuristic streams that
/// duplicate a Plaid stream (same merchant + cadence) are tombstoned on the
/// next pass.
/// </summary>
public interface IHeuristicRecurringDetector
{
    Task<HeuristicDetectionResult> DetectAsync(int userId, CancellationToken ct = default);
}

public record HeuristicDetectionResult(int StreamsAdded, int StreamsUpdated, int StreamsTombstoned);

public class HeuristicRecurringDetector : IHeuristicRecurringDetector
{
    /// <summary>How far back to look for recurrence (≥ 3 cycles of a monthly bill).</summary>
    private const int LookbackDays = 120;

    /// <summary>Amount tolerance for cluster membership: ±5% of the running mean.</summary>
    private const decimal AmountTolerancePercent = 0.05m;

    /// <summary>Minimum number of like-amount transactions to call a cluster recurring.</summary>
    private const int MinOccurrences = 3;

    private readonly ApplicationDbContext _db;
    private readonly SpendingOptions _options;
    private readonly ILogger<HeuristicRecurringDetector> _logger;

    public HeuristicRecurringDetector(
        ApplicationDbContext db,
        Microsoft.Extensions.Options.IOptions<SpendingOptions> options,
        ILogger<HeuristicRecurringDetector> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<HeuristicDetectionResult> DetectAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddDays(-LookbackDays);

        var cashAcctIds = await _db.CashAccounts.Where(a => a.UserId == userId)
            .Select(a => a.CashAccountId).ToListAsync(ct);
        var liabilityAcctIds = await _db.LiabilityAccounts.Where(l => l.UserId == userId)
            .Select(l => l.LiabilityAccountId).ToListAsync(ct);

        var txs = await _db.CashTransactions
            .Where(t => t.TransactionDate >= windowStart && t.TransactionDate < now)
            .Where(t => t.Merchant != null && t.Merchant != "")
            .Where(t =>
                (t.CashAccountId != null && cashAcctIds.Contains(t.CashAccountId.Value)) ||
                (t.LiabilityAccountId != null && liabilityAcctIds.Contains(t.LiabilityAccountId.Value)))
            .Where(t => !_options.InternalTransferCategories.Contains(t.PlaidCategoryDetailed!))
            .ToListAsync(ct);

        // Drop additional internal-transfer signals (PFMP category, description prefix)
        txs = txs.Where(t => !IsInternalTransfer(t)).ToList();

        // Group by normalized merchant + sign (inflow vs outflow) so credit/debit
        // pairs on the same payee don't cluster together.
        var groups = txs
            .GroupBy(t => new
            {
                Merchant = (t.Merchant ?? "").Trim().ToLowerInvariant(),
                Direction = t.Amount >= 0 ? RecurringStreamDirection.Inflow : RecurringStreamDirection.Outflow,
            })
            .Where(g => g.Count() >= MinOccurrences)
            .ToList();

        // Load existing heuristic streams once so we can update / insert.
        var existing = await _db.RecurringTransactionStreams
            .Where(r => r.UserId == userId)
            .ToListAsync(ct);

        // Plaid-source streams used as tie-breakers — heuristic skips merchants
        // Plaid already covers (same direction + cadence).
        var plaidStreams = existing
            .Where(s => s.Source == RecurringStreamSource.PlaidRecurring && s.IsActive)
            .ToLookup(s => $"{s.MerchantName.ToLowerInvariant()}|{s.Direction}|{s.Frequency}");

        int added = 0, updated = 0, tombstoned = 0;

        foreach (var group in groups)
        {
            var clusters = ClusterByAmount(group.OrderBy(t => t.TransactionDate).ToList());
            foreach (var cluster in clusters)
            {
                if (cluster.Count < MinOccurrences) continue;

                var avgAmount = cluster.Average(t => Math.Abs(t.Amount));
                var lastAmount = Math.Abs(cluster.Last().Amount);
                var lastDate = cluster.Max(t => t.TransactionDate);
                var freq = InferFrequency(cluster.Select(t => t.TransactionDate).ToList());
                var direction = group.Key.Direction;
                var merchant = cluster.First().Merchant ?? group.Key.Merchant;

                // Defer to Plaid for the same merchant + direction + cadence.
                var plaidKey = $"{merchant.ToLowerInvariant()}|{direction}|{freq}";
                if (plaidStreams.Contains(plaidKey)) continue;

                var match = existing.FirstOrDefault(s =>
                    s.Source == RecurringStreamSource.Heuristic
                    && string.Equals(s.MerchantName, merchant, StringComparison.OrdinalIgnoreCase)
                    && s.Direction == direction);

                if (match is null)
                {
                    _db.RecurringTransactionStreams.Add(new RecurringTransactionStream
                    {
                        UserId = userId,
                        Source = RecurringStreamSource.Heuristic,
                        MerchantName = merchant,
                        Direction = direction,
                        AverageAmount = avgAmount,
                        LastAmount = lastAmount,
                        Frequency = freq,
                        LastDate = lastDate,
                        NextExpectedDate = NextExpected(lastDate, freq),
                        IsActive = true,
                        Status = cluster.Count >= 4 ? RecurringStreamStatus.Mature : RecurringStreamStatus.EarlyDetection,
                        ConfidenceScore = ScoreCluster(cluster),
                        DateCreated = now,
                        DateUpdated = now,
                    });
                    added++;
                }
                else
                {
                    match.AverageAmount = avgAmount;
                    match.LastAmount = lastAmount;
                    match.LastDate = lastDate;
                    match.Frequency = freq;
                    match.NextExpectedDate = NextExpected(lastDate, freq);
                    match.IsActive = true;
                    match.Status = cluster.Count >= 4 ? RecurringStreamStatus.Mature : RecurringStreamStatus.EarlyDetection;
                    match.ConfidenceScore = ScoreCluster(cluster);
                    match.DateUpdated = now;
                    updated++;
                }
            }
        }

        // Tombstone heuristic streams whose merchant now also has an active
        // Plaid stream at the same direction + cadence.
        foreach (var heuristic in existing.Where(s => s.Source == RecurringStreamSource.Heuristic && s.IsActive))
        {
            var key = $"{heuristic.MerchantName.ToLowerInvariant()}|{heuristic.Direction}|{heuristic.Frequency}";
            if (plaidStreams.Contains(key))
            {
                heuristic.IsActive = false;
                heuristic.Status = RecurringStreamStatus.Tombstoned;
                heuristic.DateUpdated = now;
                tombstoned++;
            }
        }

        if (added + updated + tombstoned > 0)
        {
            await _db.SaveChangesAsync(ct);
        }

        _logger.LogInformation(
            "HeuristicRecurringDetector for user {UserId}: +{Added} new, {Updated} updated, {Tombstoned} tombstoned",
            userId, added, updated, tombstoned);
        return new HeuristicDetectionResult(added, updated, tombstoned);
    }

    /// <summary>
    /// Greedy single-pass amount clusterer. Walks the merchant's transactions
    /// in date order; for each tx, assigns to the first cluster whose running
    /// mean is within ±5%, else starts a new cluster.
    /// </summary>
    internal static List<List<CashTransaction>> ClusterByAmount(IReadOnlyList<CashTransaction> txs)
    {
        var clusters = new List<List<CashTransaction>>();
        foreach (var tx in txs)
        {
            var amount = Math.Abs(tx.Amount);
            var added = false;
            foreach (var cluster in clusters)
            {
                var mean = cluster.Average(t => Math.Abs(t.Amount));
                if (mean == 0) continue;
                var deviation = Math.Abs(amount - mean) / mean;
                if (deviation <= AmountTolerancePercent)
                {
                    cluster.Add(tx);
                    added = true;
                    break;
                }
            }
            if (!added) clusters.Add(new List<CashTransaction> { tx });
        }
        return clusters;
    }

    /// <summary>
    /// Map the typical gap (median, in days) between consecutive transactions
    /// in a cluster to one of the supported recurring frequencies. Unknown when
    /// the data is too sparse / inconsistent to call.
    /// </summary>
    internal static RecurringStreamFrequency InferFrequency(IReadOnlyList<DateTime> dates)
    {
        if (dates.Count < 2) return RecurringStreamFrequency.Unknown;
        var ordered = dates.OrderBy(d => d).ToList();
        var gaps = new List<double>();
        for (int i = 1; i < ordered.Count; i++)
        {
            gaps.Add((ordered[i] - ordered[i - 1]).TotalDays);
        }
        gaps.Sort();
        double medianGap = gaps.Count % 2 == 1
            ? gaps[gaps.Count / 2]
            : (gaps[(gaps.Count / 2) - 1] + gaps[gaps.Count / 2]) / 2d;

        // Bands matching the conversion factors used elsewhere in Wave 14.
        if (medianGap >= 5 && medianGap <= 9) return RecurringStreamFrequency.Weekly;     // ~7
        if (medianGap >= 12 && medianGap <= 16) return RecurringStreamFrequency.Biweekly; // ~14
        if (medianGap >= 13 && medianGap <= 17) return RecurringStreamFrequency.SemiMonthly; // 15 (1st/15th)
        if (medianGap >= 26 && medianGap <= 35) return RecurringStreamFrequency.Monthly;  // ~30
        if (medianGap >= 350 && medianGap <= 380) return RecurringStreamFrequency.Annual; // ~365
        return RecurringStreamFrequency.Unknown;
    }

    private static DateTime? NextExpected(DateTime last, RecurringStreamFrequency freq) => freq switch
    {
        RecurringStreamFrequency.Weekly => last.AddDays(7),
        RecurringStreamFrequency.Biweekly => last.AddDays(14),
        RecurringStreamFrequency.SemiMonthly => last.AddDays(15),
        RecurringStreamFrequency.Monthly => last.AddMonths(1),
        RecurringStreamFrequency.Annual => last.AddYears(1),
        _ => null,
    };

    /// <summary>
    /// Confidence score = (1 − amount CV) clamped to [0, 1]. Tighter amount
    /// spread → higher confidence. 4-decimal precision matches the column type.
    /// </summary>
    private static decimal ScoreCluster(IReadOnlyList<CashTransaction> cluster)
    {
        var amounts = cluster.Select(t => Math.Abs(t.Amount)).ToList();
        var mean = amounts.Average();
        if (mean == 0) return 0m;
        var variance = amounts.Sum(a => (a - mean) * (a - mean)) / amounts.Count;
        var stdDev = (decimal)Math.Sqrt((double)variance);
        var cv = stdDev / mean;
        var raw = 1m - cv;
        return Math.Round(Math.Clamp(raw, 0m, 1m), 4);
    }

    private bool IsInternalTransfer(CashTransaction tx)
    {
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
}
