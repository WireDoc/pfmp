using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services.MarketData;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/market-data")]
public class MarketDataController : ControllerBase
{
    private readonly IMarketDataService _marketDataService;
    private readonly ILogger<MarketDataController> _logger;

    public MarketDataController(IMarketDataService marketDataService, ILogger<MarketDataController> logger)
    {
        _marketDataService = marketDataService;
        _logger = logger;
    }

    /// <summary>
    /// Get real-time quote for a single symbol
    /// </summary>
    /// <param name="symbol">Stock symbol (e.g., AAPL, SPY, BTC-USD)</param>
    [HttpGet("quote/{symbol}")]
    public async Task<ActionResult<FmpQuote>> GetQuote(string symbol)
    {
        var quote = await _marketDataService.GetQuoteAsync(symbol.ToUpper());
        
        if (quote == null)
        {
            return NotFound(new { message = $"Quote not found for symbol: {symbol}" });
        }

        return Ok(quote);
    }

    /// <summary>
    /// Get real-time quotes for multiple symbols (bulk operation)
    /// </summary>
    /// <param name="symbols">Comma-separated symbols (e.g., AAPL,SPY,MSFT)</param>
    [HttpGet("quotes")]
    public async Task<ActionResult<List<FmpQuote>>> GetQuotes([FromQuery] string symbols)
    {
        if (string.IsNullOrWhiteSpace(symbols))
        {
            return BadRequest(new { message = "Symbols parameter is required" });
        }

        var symbolList = symbols.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.ToUpper())
            .ToList();

        var quotes = await _marketDataService.GetQuotesAsync(symbolList);
        return Ok(quotes);
    }

    /// <summary>
    /// Get historical prices for a symbol
    /// </summary>
    /// <param name="symbol">Stock symbol</param>
    /// <param name="from">Start date (optional, format: yyyy-MM-dd)</param>
    /// <param name="to">End date (optional, format: yyyy-MM-dd)</param>
    [HttpGet("historical/{symbol}")]
    public async Task<ActionResult<List<FmpHistoricalPrice>>> GetHistoricalPrices(
        string symbol,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var prices = await _marketDataService.GetHistoricalPricesAsync(symbol.ToUpper(), from, to);
        return Ok(prices);
    }

    /// <summary>
    /// Get company profile and details
    /// </summary>
    /// <param name="symbol">Stock symbol</param>
    [HttpGet("company/{symbol}")]
    public async Task<ActionResult<FmpCompanyProfile>> GetCompanyProfile(string symbol)
    {
        var profile = await _marketDataService.GetCompanyProfileAsync(symbol.ToUpper());
        
        if (profile == null)
        {
            return NotFound(new { message = $"Company profile not found for symbol: {symbol}" });
        }

        return Ok(profile);
    }
}
