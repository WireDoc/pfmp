using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Market data controller providing real-time financial information
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class MarketController : ControllerBase
    {
        private readonly IMarketDataService _marketDataService;
        private readonly ILogger<MarketController> _logger;

        public MarketController(IMarketDataService marketDataService, ILogger<MarketController> logger)
        {
            _marketDataService = marketDataService;
            _logger = logger;
        }

        /// <summary>
        /// Get current stock price for a symbol
        /// </summary>
        /// <param name="symbol">Stock symbol (e.g., "AAPL", "MSFT")</param>
        /// <returns>Current price and metadata</returns>
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
                var price = await _marketDataService.GetStockPriceAsync(symbol);
                
                if (price == null)
                {
                    return NotFound($"Price data not found for symbol {symbol}");
                }

                return Ok(price);
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
        /// <returns>Dictionary of symbol to price data</returns>
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
        /// <returns>Current market indices data</returns>
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
        /// Get TSP fund prices (G, F, C, S, I, and lifecycle funds)
        /// </summary>
        /// <returns>Current TSP fund prices</returns>
        [HttpGet("tsp")]
        public async Task<ActionResult<Dictionary<string, MarketPrice>>> GetTSPFundPrices()
        {
            try
            {
                var tspPrices = await _marketDataService.GetTSPFundPricesAsync();
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
        /// <returns>Key economic indicators</returns>
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
        /// <returns>Complete market overview</returns>
        [HttpGet("overview")]
        public async Task<ActionResult<MarketOverview>> GetMarketOverview()
        {
            try
            {
                var marketIndicesTask = _marketDataService.GetMarketIndicesAsync();
                var tspFundsTask = _marketDataService.GetTSPFundPricesAsync();
                var economicIndicatorsTask = _marketDataService.GetEconomicIndicatorsAsync();

                await Task.WhenAll(marketIndicesTask, tspFundsTask, economicIndicatorsTask);

                var overview = new MarketOverview
                {
                    Indices = await marketIndicesTask,
                    TSPFunds = await tspFundsTask,
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
        /// <returns>Service health status</returns>
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
    }

    /// <summary>
    /// Comprehensive market overview response
    /// </summary>
    public class MarketOverview
    {
        public MarketIndices Indices { get; set; } = new();
        public Dictionary<string, MarketPrice> TSPFunds { get; set; } = new();
        public EconomicIndicators EconomicIndicators { get; set; } = new();
        public DateTime LastUpdated { get; set; }
    }

    /// <summary>
    /// Market data service health status
    /// </summary>
    public class ServiceHealth
    {
        public bool IsAvailable { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime LastChecked { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}