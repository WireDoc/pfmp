using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services;

namespace PFMP_API.Jobs;

/// <summary>
/// Background job to refresh TSP fund prices from DailyTSP.com API.
/// Wave 10: Background Jobs & Automation
/// 
/// TSP prices are updated once per business day after market close (~6 PM ET).
/// This job runs daily to ensure we have the latest prices for TSP valuations.
/// 
/// Updates:
/// 1. TSPFundPrices table - global price cache (one row per day)
/// 2. TspLifecyclePositions - per-user holdings with CurrentPrice and CurrentMarketValue
/// </summary>
public class TspPriceRefreshJob
{
    private readonly ApplicationDbContext _db;
    private readonly TSPService _tspService;
    private readonly ILogger<TspPriceRefreshJob> _logger;

    public TspPriceRefreshJob(ApplicationDbContext db, TSPService tspService, ILogger<TspPriceRefreshJob> logger)
    {
        _db = db;
        _tspService = tspService;
        _logger = logger;
    }

    /// <summary>
    /// Fetch and persist latest TSP fund prices
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

            // 1. Save to TSPFundPrices table (upsert by date)
            var priceDate = DateTime.SpecifyKind(tspData.Date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var existingPrice = await _db.TSPFundPrices
                .FirstOrDefaultAsync(p => p.PriceDate.Date == priceDate.Date, cancellationToken);

            if (existingPrice == null)
            {
                var newPrice = new TSPFundPrice
                {
                    PriceDate = priceDate,
                    GFundPrice = (decimal)tspData.GFund,
                    FFundPrice = (decimal)tspData.FFund,
                    CFundPrice = (decimal)tspData.CFund,
                    SFundPrice = (decimal)tspData.SFund,
                    IFundPrice = (decimal)tspData.IFund,
                    LIncomeFundPrice = (decimal)tspData.LIncome,
                    L2030FundPrice = (decimal)tspData.L2030,
                    L2035FundPrice = (decimal)tspData.L2035,
                    L2040FundPrice = (decimal)tspData.L2040,
                    L2045FundPrice = (decimal)tspData.L2045,
                    L2050FundPrice = (decimal)tspData.L2050,
                    L2055FundPrice = (decimal)tspData.L2055,
                    L2060FundPrice = (decimal)tspData.L2060,
                    L2065FundPrice = (decimal)tspData.L2065,
                    L2070FundPrice = (decimal)tspData.L2070,
                    L2075FundPrice = (decimal)tspData.L2075,
                    CreatedAt = DateTime.UtcNow,
                    DataSource = "DailyTSP_API"
                };
                _db.TSPFundPrices.Add(newPrice);
                _logger.LogInformation("[TspPriceRefreshJob] Inserted new TSPFundPrice for {Date}", priceDate.Date);
            }
            else
            {
                // Update existing record
                existingPrice.GFundPrice = (decimal)tspData.GFund;
                existingPrice.FFundPrice = (decimal)tspData.FFund;
                existingPrice.CFundPrice = (decimal)tspData.CFund;
                existingPrice.SFundPrice = (decimal)tspData.SFund;
                existingPrice.IFundPrice = (decimal)tspData.IFund;
                existingPrice.LIncomeFundPrice = (decimal)tspData.LIncome;
                existingPrice.L2030FundPrice = (decimal)tspData.L2030;
                existingPrice.L2035FundPrice = (decimal)tspData.L2035;
                existingPrice.L2040FundPrice = (decimal)tspData.L2040;
                existingPrice.L2045FundPrice = (decimal)tspData.L2045;
                existingPrice.L2050FundPrice = (decimal)tspData.L2050;
                existingPrice.L2055FundPrice = (decimal)tspData.L2055;
                existingPrice.L2060FundPrice = (decimal)tspData.L2060;
                existingPrice.L2065FundPrice = (decimal)tspData.L2065;
                existingPrice.L2070FundPrice = (decimal)tspData.L2070;
                existingPrice.L2075FundPrice = (decimal)tspData.L2075;
                _logger.LogInformation("[TspPriceRefreshJob] Updated existing TSPFundPrice for {Date}", priceDate.Date);
            }

            // 2. Build price dictionary for position updates
            var prices = TSPService.ConvertToPriceDictionary(tspData);
            var now = DateTime.UtcNow;

            // 3. Update all TspLifecyclePositions with current prices
            var positions = await _db.TspLifecyclePositions.ToListAsync(cancellationToken);
            var updatedCount = 0;

            foreach (var position in positions)
            {
                var normalizedCode = TSPService.NormalizeFundCode(position.FundCode);
                if (prices.TryGetValue(normalizedCode, out var price) && price > 0)
                {
                    position.CurrentPrice = price;
                    position.CurrentMarketValue = position.Units * price;
                    position.LastPricedAsOfUtc = now;
                    updatedCount++;
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            stopwatch.Stop();
            _logger.LogInformation(
                "[TspPriceRefreshJob] Completed TSP price refresh in {ElapsedMs}ms. Updated {Count} positions.",
                stopwatch.ElapsedMilliseconds,
                updatedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TspPriceRefreshJob] Failed to refresh TSP prices");
            throw; // Re-throw to mark job as failed for Hangfire retry
        }
    }
}
