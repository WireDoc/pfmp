using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services;

/// <summary>
/// Wave 16 §8.1 — Refresh and read pre-computed per-symbol price metrics.
/// All FMP traffic is routed through <see cref="PriceHistoryService"/>, which
/// persists to the existing <c>PriceHistory</c> cache. This service derives the
/// small set of numbers the AI context block needs (52w high/low, YTD %).
/// </summary>
public interface ISymbolMetricsService
{
    /// <summary>Refresh a single symbol from cached daily prices (fetches FMP if missing).</summary>
    Task<SymbolMetricsCache?> RefreshAsync(string symbol, CancellationToken cancellationToken = default);

    /// <summary>Refresh every distinct symbol that appears on any active Holding.</summary>
    Task<int> RefreshAllHoldingSymbolsAsync(CancellationToken cancellationToken = default);

    /// <summary>Bulk read for a set of symbols (used by AI context builder).</summary>
    Task<IReadOnlyDictionary<string, SymbolMetricsCache>> GetBatchAsync(IEnumerable<string> symbols, CancellationToken cancellationToken = default);
}

public class SymbolMetricsService : ISymbolMetricsService
{
    private readonly ApplicationDbContext _context;
    private readonly PriceHistoryService _priceHistory;
    private readonly ILogger<SymbolMetricsService> _logger;

    public SymbolMetricsService(
        ApplicationDbContext context,
        PriceHistoryService priceHistory,
        ILogger<SymbolMetricsService> logger)
    {
        _context = context;
        _priceHistory = priceHistory;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<string, SymbolMetricsCache>> GetBatchAsync(
        IEnumerable<string> symbols, CancellationToken cancellationToken = default)
    {
        var distinct = symbols
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim().ToUpperInvariant())
            .Distinct()
            .ToList();
        if (distinct.Count == 0)
            return new Dictionary<string, SymbolMetricsCache>(StringComparer.OrdinalIgnoreCase);

        var rows = await _context.SymbolMetricsCache
            .Where(m => distinct.Contains(m.Symbol))
            .ToListAsync(cancellationToken);
        return rows.ToDictionary(r => r.Symbol, r => r, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<SymbolMetricsCache?> RefreshAsync(string symbol, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return null;
        symbol = symbol.Trim().ToUpperInvariant();

        // Pull ~380 days so we always have the prior year's close for the YTD baseline.
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-380);

        List<PriceHistory> rows;
        try
        {
            rows = await _priceHistory.GetPriceHistoryAsync(symbol, startDate, endDate);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SymbolMetrics: PriceHistoryService failed for {Symbol}", symbol);
            return null;
        }

        if (rows.Count == 0)
        {
            _logger.LogDebug("SymbolMetrics: no price history for {Symbol}, skipping", symbol);
            return null;
        }

        var metrics = ComputeFromPriceHistory(symbol, rows);
        if (metrics is null) return null;

        var existing = await _context.SymbolMetricsCache.FindAsync(new object?[] { metrics.Symbol }, cancellationToken);
        if (existing is null)
        {
            _context.SymbolMetricsCache.Add(metrics);
        }
        else
        {
            existing.AsOfDate = metrics.AsOfDate;
            existing.Last = metrics.Last;
            existing.High52w = metrics.High52w;
            existing.Low52w = metrics.Low52w;
            existing.YearStartClose = metrics.YearStartClose;
            existing.YtdPercent = metrics.YtdPercent;
            existing.PercentFrom52wHigh = metrics.PercentFrom52wHigh;
            existing.PercentFrom52wLow = metrics.PercentFrom52wLow;
            existing.RefreshedAt = metrics.RefreshedAt;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return existing ?? metrics;
    }

    public async Task<int> RefreshAllHoldingSymbolsAsync(CancellationToken cancellationToken = default)
    {
        var symbols = await _context.Holdings
            .Where(h => h.Symbol != null && h.Symbol != "")
            .Select(h => h.Symbol!)
            .Distinct()
            .ToListAsync(cancellationToken);

        int refreshed = 0;
        foreach (var sym in symbols)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var result = await RefreshAsync(sym, cancellationToken);
            if (result is not null) refreshed++;
        }
        _logger.LogInformation("SymbolMetricsService: refreshed {Count}/{Total} symbols", refreshed, symbols.Count);
        return refreshed;
    }

    /// <summary>
    /// Pure, testable: derives the metrics row from a list of daily price bars.
    /// Returns null when there is no usable data.
    /// </summary>
    public static SymbolMetricsCache? ComputeFromPriceHistory(string symbol, IReadOnlyList<PriceHistory> rows)
    {
        if (rows is null || rows.Count == 0) return null;

        var ordered = rows.OrderBy(r => r.Date).ToList();
        var latest = ordered[^1];
        var asOf = DateOnly.FromDateTime(latest.Date);
        var today = asOf;

        // 52w window = trailing 365 calendar days from latest bar.
        var oneYearAgo = today.AddDays(-365);
        var trailing = ordered.Where(r => DateOnly.FromDateTime(r.Date) >= oneYearAgo).ToList();
        if (trailing.Count == 0) trailing = ordered;

        var high52w = trailing.Max(r => r.High);
        var low52w = trailing.Min(r => r.Low);
        var last = latest.Close;

        // YTD baseline: first trading day of the latest bar's year. Fall back to the
        // last close of the prior year if we don't have a January bar yet.
        decimal? ytdBaseline = null;
        var firstThisYear = ordered.FirstOrDefault(r => r.Date.Year == today.Year);
        if (firstThisYear is not null)
        {
            ytdBaseline = firstThisYear.Open != 0 ? firstThisYear.Open : firstThisYear.Close;
        }
        else
        {
            var lastPriorYear = ordered.LastOrDefault(r => r.Date.Year == today.Year - 1);
            if (lastPriorYear is not null) ytdBaseline = lastPriorYear.Close;
        }

        decimal? ytdPct = null;
        if (ytdBaseline.HasValue && ytdBaseline.Value != 0)
        {
            ytdPct = Math.Round((last - ytdBaseline.Value) / ytdBaseline.Value * 100m, 4);
        }

        decimal pctFromHigh = high52w == 0 ? 0m : Math.Round((last - high52w) / high52w * 100m, 4);
        decimal pctFromLow = low52w == 0 ? 0m : Math.Round((last - low52w) / low52w * 100m, 4);

        return new SymbolMetricsCache
        {
            Symbol = symbol.Trim().ToUpperInvariant(),
            AsOfDate = asOf,
            Last = last,
            High52w = high52w,
            Low52w = low52w,
            YearStartClose = ytdBaseline,
            YtdPercent = ytdPct,
            PercentFrom52wHigh = pctFromHigh,
            PercentFrom52wLow = pctFromLow,
            RefreshedAt = DateTime.UtcNow
        };
    }
}
