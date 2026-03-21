using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;
using PFMP_API.Services.MarketData;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/market-data")]
public class MarketDataController : ControllerBase
{
    private readonly IMarketDataService _marketDataService;
    private readonly TSPService _tspService;
    private readonly ILogger<MarketDataController> _logger;

    public MarketDataController(
        IMarketDataService marketDataService,
        TSPService tspService,
        ILogger<MarketDataController> logger)
    {
        _marketDataService = marketDataService;
        _tspService = tspService;
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

    /// <summary>
    /// Get current stock price for a symbol (returns MarketPrice format)
    /// </summary>
    /// <param name="symbol">Stock symbol (e.g., "AAPL", "MSFT")</param>
    [HttpGet("price/{symbol}")]
    public async Task<ActionResult<MarketPrice>> GetStockPrice(string symbol)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(symbol))
            {
                return BadRequest("Symbol is required");
            }

            symbol = symbol.ToUpperInvariant();
            var quote = await _marketDataService.GetQuoteAsync(symbol);

            if (quote == null)
            {
                return NotFound($"Price data not found for symbol {symbol}");
            }

            return Ok(new MarketPrice
            {
                Symbol = quote.Symbol,
                Price = quote.Price,
                Change = quote.Change,
                ChangePercent = quote.ChangesPercentage,
                Volume = quote.Volume ?? 0,
                DayHigh = quote.DayHigh ?? 0,
                DayLow = quote.DayLow ?? 0,
                Open = quote.Open ?? 0,
                PreviousClose = quote.PreviousClose ?? 0,
                LastUpdated = DateTime.UtcNow,
                Exchange = quote.Exchange,
                CompanyName = quote.Name
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stock price for symbol {Symbol}", symbol);
            return StatusCode(500, "Internal server error while retrieving stock price");
        }
    }

    /// <summary>
    /// Get current prices for multiple symbols
    /// </summary>
    /// <param name="symbols">Comma-separated list of stock symbols</param>
    [HttpGet("prices")]
    public async Task<ActionResult<Dictionary<string, MarketPrice>>> GetStockPrices([FromQuery] string symbols)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(symbols))
            {
                return BadRequest("Symbols parameter is required");
            }

            var symbolList = symbols.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                   .Select(s => s.Trim().ToUpperInvariant())
                                   .Where(s => !string.IsNullOrEmpty(s))
                                   .ToList();

            if (!symbolList.Any())
            {
                return BadRequest("At least one valid symbol is required");
            }

            if (symbolList.Count > 50)
            {
                return BadRequest("Maximum 50 symbols allowed per request");
            }

            var prices = await _marketDataService.GetStockPricesAsync(symbolList);
            return Ok(prices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stock prices for symbols {Symbols}", symbols);
            return StatusCode(500, "Internal server error while retrieving stock prices");
        }
    }

    /// <summary>
    /// Get major market indices (S&P 500, NASDAQ, DOW, Russell 2000, VIX)
    /// </summary>
    [HttpGet("indices")]
    public async Task<ActionResult<MarketIndices>> GetMarketIndices()
    {
        try
        {
            var indices = await _marketDataService.GetMarketIndicesAsync();
            return Ok(indices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting market indices");
            return StatusCode(500, "Internal server error while retrieving market indices");
        }
    }

    /// <summary>
    /// Get TSP fund prices (G, F, C, S, I, and lifecycle funds) from DailyTSP.com
    /// </summary>
    [HttpGet("tsp")]
    public async Task<ActionResult<Dictionary<string, MarketPrice>>> GetTSPFundPrices()
    {
        try
        {
            var tspData = await _tspService.GetTSPDataAsync();

            if (tspData == null)
            {
                _logger.LogWarning("Failed to retrieve TSP data from DailyTSP API");
                return StatusCode(500, "Failed to retrieve TSP data");
            }

            var tspPrices = new Dictionary<string, MarketPrice>
            {
                ["G Fund"] = new MarketPrice { Symbol = "G", Price = (decimal)tspData.GFund, CompanyName = "Government Securities Investment Fund" },
                ["F Fund"] = new MarketPrice { Symbol = "F", Price = (decimal)tspData.FFund, CompanyName = "Fixed Income Index Investment Fund" },
                ["C Fund"] = new MarketPrice { Symbol = "C", Price = (decimal)tspData.CFund, CompanyName = "Common Stock Index Investment Fund" },
                ["S Fund"] = new MarketPrice { Symbol = "S", Price = (decimal)tspData.SFund, CompanyName = "Small Capitalization Stock Index Investment Fund" },
                ["I Fund"] = new MarketPrice { Symbol = "I", Price = (decimal)tspData.IFund, CompanyName = "International Stock Index Investment Fund" },
                ["L Income"] = new MarketPrice { Symbol = "L-Income", Price = (decimal)tspData.LIncome, CompanyName = "L Income Fund" },
                ["L 2025"] = new MarketPrice { Symbol = "L2025", Price = (decimal)tspData.L2025, CompanyName = "L 2025 Fund" },
                ["L 2030"] = new MarketPrice { Symbol = "L2030", Price = (decimal)tspData.L2030, CompanyName = "L 2030 Fund" },
                ["L 2035"] = new MarketPrice { Symbol = "L2035", Price = (decimal)tspData.L2035, CompanyName = "L 2035 Fund" },
                ["L 2040"] = new MarketPrice { Symbol = "L2040", Price = (decimal)tspData.L2040, CompanyName = "L 2040 Fund" },
                ["L 2045"] = new MarketPrice { Symbol = "L2045", Price = (decimal)tspData.L2045, CompanyName = "L 2045 Fund" },
                ["L 2050"] = new MarketPrice { Symbol = "L2050", Price = (decimal)tspData.L2050, CompanyName = "L 2050 Fund" },
                ["L 2055"] = new MarketPrice { Symbol = "L2055", Price = (decimal)tspData.L2055, CompanyName = "L 2055 Fund" },
                ["L 2060"] = new MarketPrice { Symbol = "L2060", Price = (decimal)tspData.L2060, CompanyName = "L 2060 Fund" },
                ["L 2065"] = new MarketPrice { Symbol = "L2065", Price = (decimal)tspData.L2065, CompanyName = "L 2065 Fund" },
                ["L 2070"] = new MarketPrice { Symbol = "L2070", Price = (decimal)tspData.L2070, CompanyName = "L 2070 Fund" },
                ["L 2075"] = new MarketPrice { Symbol = "L2075", Price = (decimal)tspData.L2075, CompanyName = "L 2075 Fund" }
            };

            return Ok(tspPrices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TSP fund prices");
            return StatusCode(500, "Internal server error while retrieving TSP fund prices");
        }
    }

    /// <summary>
    /// Get economic indicators (Treasury yields, VIX, commodities, etc.)
    /// </summary>
    [HttpGet("economic")]
    public async Task<ActionResult<EconomicIndicators>> GetEconomicIndicators()
    {
        try
        {
            var indicators = await _marketDataService.GetEconomicIndicatorsAsync();
            return Ok(indicators);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting economic indicators");
            return StatusCode(500, "Internal server error while retrieving economic indicators");
        }
    }

    /// <summary>
    /// Get comprehensive market overview including indices, TSP funds, and economic indicators
    /// </summary>
    [HttpGet("overview")]
    public async Task<ActionResult<MarketOverview>> GetMarketOverview()
    {
        try
        {
            var marketIndicesTask = _marketDataService.GetMarketIndicesAsync();
            var tspPricesTask = _tspService.GetTSPPricesAsDictionaryAsync();
            var economicIndicatorsTask = _marketDataService.GetEconomicIndicatorsAsync();

            await Task.WhenAll(marketIndicesTask, tspPricesTask, economicIndicatorsTask);

            var tspPrices = await tspPricesTask ?? new Dictionary<string, decimal>();
            var tspFunds = tspPrices.ToDictionary(
                kvp => kvp.Key,
                kvp => new MarketPrice
                {
                    Symbol = kvp.Key,
                    Price = kvp.Value,
                    CompanyName = GetTspFundName(kvp.Key),
                    ChangePercent = 0,
                    LastUpdated = DateTime.UtcNow
                }
            );

            var overview = new MarketOverview
            {
                Indices = await marketIndicesTask,
                TSPFunds = tspFunds,
                EconomicIndicators = await economicIndicatorsTask,
                LastUpdated = DateTime.UtcNow
            };

            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting market overview");
            return StatusCode(500, "Internal server error while retrieving market overview");
        }
    }

    /// <summary>
    /// Check market data service health and availability
    /// </summary>
    [HttpGet("health")]
    public async Task<ActionResult<ServiceHealth>> GetServiceHealth()
    {
        try
        {
            var isAvailable = await _marketDataService.IsServiceAvailableAsync();
            var health = new ServiceHealth
            {
                IsAvailable = isAvailable,
                Status = isAvailable ? "Healthy" : "Degraded",
                LastChecked = DateTime.UtcNow,
                Message = isAvailable
                    ? "Market data service is operational"
                    : "Market data service is unavailable, using fallback data"
            };

            return Ok(health);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking market data service health");
            return Ok(new ServiceHealth
            {
                IsAvailable = false,
                Status = "Error",
                LastChecked = DateTime.UtcNow,
                Message = "Error checking service health"
            });
        }
    }

    private static string GetTspFundName(string code)
    {
        return code.ToUpperInvariant() switch
        {
            "G" => "G Fund (Government Securities)",
            "F" => "F Fund (Fixed Income)",
            "C" => "C Fund (Common Stock)",
            "S" => "S Fund (Small Cap Stock)",
            "I" => "I Fund (International Stock)",
            "LINCOME" => "L Income Fund",
            "L2025" => "L 2025 Fund",
            "L2030" => "L 2030 Fund",
            "L2035" => "L 2035 Fund",
            "L2040" => "L 2040 Fund",
            "L2045" => "L 2045 Fund",
            "L2050" => "L 2050 Fund",
            "L2055" => "L 2055 Fund",
            "L2060" => "L 2060 Fund",
            "L2065" => "L 2065 Fund",
            "L2070" => "L 2070 Fund",
            "L2075" => "L 2075 Fund",
            _ => $"TSP {code} Fund"
        };
    }
}
