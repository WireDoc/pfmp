using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P4: 90-day (configurable 30-180) cash-flow forecast. P50 = expected
/// daily balance trajectory from the user's current cash balance plus all
/// recurring streams + averaged discretionary outflows + scheduled liability
/// payments. Bands are ±1σ × √t around P50, where σ is the standard deviation
/// of the user's last 90 days of daily net cash flow — a random-walk-like
/// fan-out so the band widens with time horizon.
///
/// All-streams-feed-P50 design (per user spec): heuristic and Plaid Mature
/// streams contribute identically to the projected trajectory. The σ band
/// captures historical variance independently.
/// </summary>
public interface ICashFlowForecastService
{
    Task<CashFlowForecast> ForecastAsync(int userId, int horizonDays, CancellationToken ct = default);
    Task<RecurringImpactResponse> RecurringImpactAsync(int userId, int horizonDays, CancellationToken ct = default);
}

public record CashFlowForecast(
    DateTime StartDate,
    DateTime EndDate,
    int HorizonDays,
    decimal StartingBalance,
    decimal HistoricalDailyStdDev,
    IReadOnlyList<ForecastDay> Days,
    IReadOnlyList<RecurringContribution> RecurringContributions,
    decimal AvgDailyDiscretionary,
    DateTime AsOfUtc);

public record ForecastDay(
    DateTime Date,
    decimal LowerBalance,     // P50 - 1σ × √t
    decimal ProjectedBalance, // P50
    decimal UpperBalance,     // P50 + 1σ × √t
    decimal ExpectedNetFlow,  // delta from previous day's projected balance
    IReadOnlyList<ForecastEvent> Events);

public record ForecastEvent(
    string Kind,    // "RecurringIn" | "RecurringOut" | "Liability" | "Discretionary"
    string Label,
    decimal Amount);

public record RecurringContribution(
    int StreamId,
    string MerchantName,
    string Direction,
    string Frequency,
    string Source,
    decimal MonthlyAverage,
    decimal HorizonContribution);

public record RecurringImpactResponse(
    int HorizonDays,
    decimal TotalHorizonInflow,
    decimal TotalHorizonOutflow,
    IReadOnlyList<RecurringContribution> Contributions);

public class CashFlowForecastService : ICashFlowForecastService
{
    /// <summary>Min horizon allowed (UI dropdown floor).</summary>
    public const int MinHorizonDays = 30;
    /// <summary>Max horizon allowed (UI dropdown ceiling). Beyond 180 days the band fan-out exceeds usefulness.</summary>
    public const int MaxHorizonDays = 180;
    /// <summary>Lookback window for the historical σ computation.</summary>
    private const int HistoricalDaysForSigma = 90;

    private readonly ApplicationDbContext _db;
    private readonly SpendingOptions _options;
    private readonly ILogger<CashFlowForecastService> _logger;

    public CashFlowForecastService(
        ApplicationDbContext db,
        Microsoft.Extensions.Options.IOptions<SpendingOptions> options,
        ILogger<CashFlowForecastService> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<CashFlowForecast> ForecastAsync(int userId, int horizonDays, CancellationToken ct = default)
    {
        horizonDays = Math.Clamp(horizonDays, MinHorizonDays, MaxHorizonDays);
        var asOf = DateTime.UtcNow;
        var startDate = asOf.Date.AddDays(1); // forecast starts tomorrow
        var endDate = startDate.AddDays(horizonDays);

        var startingBalance = await ComputeStartingBalanceAsync(userId, ct);
        var streams = await _db.RecurringTransactionStreams
            .Where(r => r.UserId == userId && r.IsActive)
            .ToListAsync(ct);
        var liabilities = await _db.LiabilityAccounts
            .Where(l => l.UserId == userId && l.NextPaymentDueDate != null)
            .ToListAsync(ct);
        var (avgDailyDiscretionary, historicalSigma) = await ComputeHistoricalStatsAsync(userId, asOf, ct);

        var dayEvents = new Dictionary<DateTime, List<ForecastEvent>>();
        for (int i = 0; i < horizonDays; i++) dayEvents[startDate.AddDays(i)] = new();

        // 1) Recurring streams — project NextExpectedDate forward, stepping by frequency.
        foreach (var s in streams)
        {
            var next = s.NextExpectedDate ?? AdvanceFromLastDate(s.LastDate, s.Frequency);
            if (next is null) continue;
            var stepDays = StepDaysFor(s.Frequency);
            if (stepDays <= 0) continue;

            var cursor = next.Value.Date;
            while (cursor < startDate) cursor = cursor.AddDays(stepDays); // skip past dates
            while (cursor < endDate)
            {
                if (dayEvents.TryGetValue(cursor, out var bucket))
                {
                    var sign = s.Direction == RecurringStreamDirection.Inflow ? 1 : -1;
                    var amount = sign * s.AverageAmount;
                    bucket.Add(new ForecastEvent(
                        Kind: s.Direction == RecurringStreamDirection.Inflow ? "RecurringIn" : "RecurringOut",
                        Label: s.MerchantName,
                        Amount: amount));
                }
                cursor = cursor.AddDays(stepDays);
            }
        }

        // 2) Liability payments — single occurrence on NextPaymentDueDate.
        foreach (var l in liabilities)
        {
            var due = l.NextPaymentDueDate!.Value.Date;
            if (due < startDate || due >= endDate) continue;
            var amount = l.MinimumPayment ?? 0m;
            if (amount <= 0) continue;
            if (dayEvents.TryGetValue(due, out var bucket))
            {
                var label = !string.IsNullOrWhiteSpace(l.Lender) ? l.Lender! : l.LiabilityType;
                bucket.Add(new ForecastEvent(
                    Kind: "Liability",
                    Label: $"{label} payment",
                    Amount: -amount));
            }
        }

        // 3) Discretionary spending — distribute the daily average uniformly.
        if (avgDailyDiscretionary > 0)
        {
            for (int i = 0; i < horizonDays; i++)
            {
                var day = startDate.AddDays(i);
                dayEvents[day].Add(new ForecastEvent(
                    Kind: "Discretionary",
                    Label: "Discretionary (avg)",
                    Amount: -avgDailyDiscretionary));
            }
        }

        // 4) Assemble ForecastDay rows; band widens by σ × √(t+1).
        var days = new List<ForecastDay>(horizonDays);
        var projected = startingBalance;
        for (int i = 0; i < horizonDays; i++)
        {
            var date = startDate.AddDays(i);
            var events = dayEvents[date];
            var net = events.Sum(e => e.Amount);
            projected += net;
            var bandWidth = historicalSigma * (decimal)Math.Sqrt(i + 1);
            days.Add(new ForecastDay(
                Date: date,
                LowerBalance: projected - bandWidth,
                ProjectedBalance: projected,
                UpperBalance: projected + bandWidth,
                ExpectedNetFlow: net,
                Events: events));
        }

        var contributions = BuildContributions(streams, horizonDays);

        return new CashFlowForecast(
            StartDate: startDate,
            EndDate: endDate,
            HorizonDays: horizonDays,
            StartingBalance: startingBalance,
            HistoricalDailyStdDev: historicalSigma,
            Days: days,
            RecurringContributions: contributions,
            AvgDailyDiscretionary: avgDailyDiscretionary,
            AsOfUtc: asOf);
    }

    public async Task<RecurringImpactResponse> RecurringImpactAsync(int userId, int horizonDays, CancellationToken ct = default)
    {
        horizonDays = Math.Clamp(horizonDays, MinHorizonDays, MaxHorizonDays);
        var streams = await _db.RecurringTransactionStreams
            .Where(r => r.UserId == userId && r.IsActive)
            .ToListAsync(ct);
        var contributions = BuildContributions(streams, horizonDays);
        var totalIn = contributions.Where(c => c.Direction == nameof(RecurringStreamDirection.Inflow)).Sum(c => c.HorizonContribution);
        var totalOut = contributions.Where(c => c.Direction == nameof(RecurringStreamDirection.Outflow)).Sum(c => c.HorizonContribution);
        return new RecurringImpactResponse(horizonDays, totalIn, totalOut, contributions);
    }

    // ----- Helpers -----

    private async Task<decimal> ComputeStartingBalanceAsync(int userId, CancellationToken ct)
    {
        return await _db.CashAccounts
            .Where(a => a.UserId == userId)
            .SumAsync(a => (decimal?)a.Balance, ct) ?? 0m;
    }

    /// <summary>
    /// Returns (avgDailyDiscretionary, historicalDailySigma). Discretionary =
    /// outflows minus recurring outflows; σ is the standard deviation of daily
    /// net cash flow (inflows − outflows, excluding internal transfers). Both
    /// are non-negative.
    /// </summary>
    internal async Task<(decimal AvgDailyDiscretionary, decimal HistoricalDailySigma)> ComputeHistoricalStatsAsync(
        int userId, DateTime asOf, CancellationToken ct)
    {
        var windowStart = asOf.Date.AddDays(-HistoricalDaysForSigma);
        var cashAcctIds = await _db.CashAccounts.Where(a => a.UserId == userId)
            .Select(a => a.CashAccountId).ToListAsync(ct);
        var liabilityAcctIds = await _db.LiabilityAccounts.Where(l => l.UserId == userId)
            .Select(l => l.LiabilityAccountId).ToListAsync(ct);
        var txs = await _db.CashTransactions
            .Where(t => t.TransactionDate >= windowStart && t.TransactionDate < asOf)
            .Where(t =>
                (t.CashAccountId != null && cashAcctIds.Contains(t.CashAccountId.Value)) ||
                (t.LiabilityAccountId != null && liabilityAcctIds.Contains(t.LiabilityAccountId.Value)))
            .ToListAsync(ct);
        var filtered = txs.Where(t => !IsInternalTransfer(t)).ToList();

        if (filtered.Count == 0) return (0m, 0m);

        // Group by date for σ computation.
        var dailyNet = filtered
            .GroupBy(t => t.TransactionDate.Date)
            .Select(g => g.Sum(t => t.Amount))
            .ToList();

        var sigma = StandardDeviation(dailyNet);

        // Discretionary average = total negative amounts not matching a recurring
        // stream merchant pattern, spread over the lookback window.
        var recurringMerchants = await _db.RecurringTransactionStreams
            .Where(r => r.UserId == userId && r.IsActive && r.Direction == RecurringStreamDirection.Outflow)
            .Select(r => r.MerchantName.ToLower())
            .ToListAsync(ct);
        var recurringSet = recurringMerchants.ToHashSet();
        var discretionarySum = filtered
            .Where(t => t.Amount < 0)
            .Where(t => t.Merchant == null || !recurringSet.Contains(t.Merchant.ToLower()))
            .Sum(t => -t.Amount);
        var avgDailyDiscretionary = discretionarySum / HistoricalDaysForSigma;

        return (Math.Max(avgDailyDiscretionary, 0m), sigma);
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

    internal static decimal StandardDeviation(IReadOnlyList<decimal> samples)
    {
        if (samples.Count < 2) return 0m;
        var mean = samples.Average();
        var variance = samples.Sum(x => (x - mean) * (x - mean)) / (samples.Count - 1);
        return (decimal)Math.Sqrt((double)variance);
    }

    internal static int StepDaysFor(RecurringStreamFrequency freq) => freq switch
    {
        RecurringStreamFrequency.Weekly => 7,
        RecurringStreamFrequency.Biweekly => 14,
        RecurringStreamFrequency.SemiMonthly => 15,
        RecurringStreamFrequency.Monthly => 30,
        RecurringStreamFrequency.Annual => 365,
        _ => 0,
    };

    internal static DateTime? AdvanceFromLastDate(DateTime lastDate, RecurringStreamFrequency freq) => freq switch
    {
        RecurringStreamFrequency.Weekly => lastDate.AddDays(7),
        RecurringStreamFrequency.Biweekly => lastDate.AddDays(14),
        RecurringStreamFrequency.SemiMonthly => lastDate.AddDays(15),
        RecurringStreamFrequency.Monthly => lastDate.AddMonths(1),
        RecurringStreamFrequency.Annual => lastDate.AddYears(1),
        _ => null,
    };

    /// <summary>Convert per-stream cadence to a monthly average + horizon contribution.</summary>
    internal static IReadOnlyList<RecurringContribution> BuildContributions(
        IReadOnlyList<RecurringTransactionStream> streams, int horizonDays)
    {
        var monthlyFactors = new Dictionary<RecurringStreamFrequency, decimal>
        {
            { RecurringStreamFrequency.Weekly, 52m / 12m },
            { RecurringStreamFrequency.Biweekly, 26m / 12m },
            { RecurringStreamFrequency.SemiMonthly, 2m },
            { RecurringStreamFrequency.Monthly, 1m },
            { RecurringStreamFrequency.Annual, 1m / 12m },
        };
        var result = new List<RecurringContribution>();
        foreach (var s in streams)
        {
            if (!monthlyFactors.TryGetValue(s.Frequency, out var factor)) continue;
            var monthly = s.AverageAmount * factor;
            var horizonContribution = monthly * horizonDays / 30m;
            result.Add(new RecurringContribution(
                StreamId: s.StreamId,
                MerchantName: s.MerchantName,
                Direction: s.Direction.ToString(),
                Frequency: s.Frequency.ToString(),
                Source: s.Source.ToString(),
                MonthlyAverage: monthly,
                HorizonContribution: horizonContribution));
        }
        return result
            .OrderByDescending(c => c.HorizonContribution)
            .ToList();
    }
}
