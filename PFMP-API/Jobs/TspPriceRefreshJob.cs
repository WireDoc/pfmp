using PFMP_API.Services;

namespace PFMP_API.Jobs;

/// <summary>
/// Background job to refresh TSP fund prices from DailyTSP.com API.
/// Wave 10: Background Jobs & Automation
/// 
/// TSP prices are updated once per business day after market close (~6 PM ET).
/// This job runs daily to ensure we have the latest prices for TSP valuations.
/// </summary>
public class TspPriceRefreshJob
{
    private readonly TSPService _tspService;
    private readonly ILogger<TspPriceRefreshJob> _logger;

    public TspPriceRefreshJob(TSPService tspService, ILogger<TspPriceRefreshJob> logger)
    {
        _tspService = tspService;
        _logger = logger;
    }

    /// <summary>
    /// Fetch and cache latest TSP fund prices
    /// </summary>
    public async Task RefreshTspPricesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[TspPriceRefreshJob] Starting TSP price refresh");
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Fetch latest TSP prices (no date = latest available)
            var tspData = await _tspService.GetTSPDataAsync();

            if (tspData == null)
            {
                _logger.LogWarning("[TspPriceRefreshJob] No TSP data returned from API");
                return;
            }

            // Log the prices we received
            _logger.LogInformation(
                "[TspPriceRefreshJob] Retrieved TSP prices for {Date}: C={CPrice:F4}, S={SPrice:F4}, I={IPrice:F4}, G={GPrice:F4}, F={FPrice:F4}",
                tspData.Date,
                tspData.CFund,
                tspData.SFund,
                tspData.IFund,
                tspData.GFund,
                tspData.FFund);

            // Also log L Fund prices if available
            if (tspData.L2025 > 0 || tspData.LIncome > 0)
            {
                _logger.LogInformation(
                    "[TspPriceRefreshJob] L Fund prices: Income={LIncome:F4}, 2025={L2025:F4}, 2030={L2030:F4}, 2035={L2035:F4}, 2040={L2040:F4}, 2045={L2045:F4}, 2050={L2050:F4}, 2055={L2055:F4}, 2060={L2060:F4}, 2065={L2065:F4}",
                    tspData.LIncome,
                    tspData.L2025,
                    tspData.L2030,
                    tspData.L2035,
                    tspData.L2040,
                    tspData.L2045,
                    tspData.L2050,
                    tspData.L2055,
                    tspData.L2060,
                    tspData.L2065);
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "[TspPriceRefreshJob] Completed TSP price refresh in {ElapsedMs}ms",
                stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TspPriceRefreshJob] Failed to refresh TSP prices");
            throw; // Re-throw to mark job as failed for Hangfire retry
        }
    }
}
