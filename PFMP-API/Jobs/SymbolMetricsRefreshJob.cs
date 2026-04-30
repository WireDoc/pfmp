using Hangfire;
using PFMP_API.Services;

namespace PFMP_API.Jobs;

/// <summary>
/// Wave 16 §8.1 — Daily refresh of <c>SymbolMetricsCache</c> (52w high/low, YTD %)
/// for every distinct symbol on any active Holding. Runs after the 11 PM ET
/// PriceRefreshJob so the underlying PriceHistory cache is already current.
/// </summary>
public class SymbolMetricsRefreshJob
{
    private readonly ISymbolMetricsService _metrics;
    private readonly ILogger<SymbolMetricsRefreshJob> _logger;

    public SymbolMetricsRefreshJob(ISymbolMetricsService metrics, ILogger<SymbolMetricsRefreshJob> logger)
    {
        _metrics = metrics;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1)]
    [Queue("price-refresh")]
    public async Task RefreshAllAsync(CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        _logger.LogInformation("SymbolMetricsRefreshJob: starting");
        var count = await _metrics.RefreshAllHoldingSymbolsAsync(cancellationToken);
        sw.Stop();
        _logger.LogInformation("SymbolMetricsRefreshJob: refreshed {Count} symbols in {Ms}ms", count, sw.ElapsedMilliseconds);
    }
}
