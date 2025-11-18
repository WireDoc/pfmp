using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/price-history")]
public class PriceHistoryController : ControllerBase
{
    private readonly PriceHistoryService _priceHistoryService;
    private readonly ILogger<PriceHistoryController> _logger;

    public PriceHistoryController(
        PriceHistoryService priceHistoryService,
        ILogger<PriceHistoryController> logger)
    {
        _priceHistoryService = priceHistoryService;
        _logger = logger;
    }

    /// <summary>
    /// Get historical price data for a symbol
    /// </summary>
    /// <param name="symbol">Stock symbol (e.g., VOO, AAPL)</param>
    /// <param name="startDate">Start date (default: 1 year ago)</param>
    /// <param name="endDate">End date (default: today)</param>
    [HttpGet("{symbol}")]
    public async Task<IActionResult> GetPriceHistory(
        string symbol,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddYears(-1);
        var end = endDate ?? DateTime.UtcNow;

        var history = await _priceHistoryService.GetPriceHistoryAsync(symbol, start, end);

        return Ok(new
        {
            symbol,
            startDate = start,
            endDate = end,
            recordCount = history.Count,
            prices = history.Select(p => new
            {
                date = p.Date,
                open = p.Open,
                high = p.High,
                low = p.Low,
                close = p.Close,
                volume = p.Volume
            })
        });
    }

    /// <summary>
    /// Get historical price data for multiple symbols
    /// </summary>
    /// <param name="symbols">Comma-separated list of symbols</param>
    /// <param name="startDate">Start date (default: 1 year ago)</param>
    /// <param name="endDate">End date (default: today)</param>
    [HttpGet("batch")]
    public async Task<IActionResult> GetPriceHistoryBatch(
        [FromQuery] string symbols,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var symbolList = symbols.Split(',').Select(s => s.Trim().ToUpper()).ToList();
        var start = startDate ?? DateTime.UtcNow.AddYears(-1);
        var end = endDate ?? DateTime.UtcNow;

        var history = await _priceHistoryService.GetPriceHistoryBatchAsync(symbolList, start, end);

        return Ok(new
        {
            symbols = symbolList,
            startDate = start,
            endDate = end,
            data = history.Select(kvp => new
            {
                symbol = kvp.Key,
                recordCount = kvp.Value.Count,
                prices = kvp.Value.Select(p => new
                {
                    date = p.Date,
                    close = p.Close
                })
            })
        });
    }

    /// <summary>
    /// Backfill missing price history for all holdings in an account
    /// </summary>
    /// <param name="accountId">Account ID</param>
    /// <param name="startDate">Start date (default: 1 year ago)</param>
    [HttpPost("backfill/account/{accountId}")]
    public async Task<IActionResult> BackfillAccountPriceHistory(
        int accountId,
        [FromQuery] DateTime? startDate = null)
    {
        var recordCount = await _priceHistoryService.BackfillAccountPriceHistoryAsync(accountId, startDate);

        return Ok(new
        {
            accountId,
            recordsAdded = recordCount,
            message = $"Backfilled {recordCount} price records for account {accountId}"
        });
    }
}
