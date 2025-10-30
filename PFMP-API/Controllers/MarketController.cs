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
        private readonly TSPService _tspService;
        private readonly ILogger<MarketController> _logger;

        public MarketController(
            IMarketDataService marketDataService, 
            TSPService tspService,
            ILogger<MarketController> logger)
        {
            _marketDataService = marketDataService;
            _tspService = tspService;
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
        /// Get TSP fund prices (G, F, C, S, I, and lifecycle funds) from DailyTSP.com
        /// </summary>
        /// <returns>Current TSP fund prices</returns>
        [HttpGet("tsp")]
        public async Task<ActionResult<Dictionary<string, MarketPrice>>> GetTSPFundPrices()
        {
            try
            {
                // Get real TSP prices from DailyTSP API
                var tspData = await _tspService.GetTSPDataAsync();
                
                if (tspData == null)
                {
                    _logger.LogWarning("Failed to retrieve TSP data from DailyTSP API");
                    return StatusCode(500, "Failed to retrieve TSP data");
                }

                // Convert TSPModel to MarketPrice dictionary format
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