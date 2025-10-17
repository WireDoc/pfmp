using System.Text.Json;

namespace PFMP_API.Services
{
    /// <summary>
    /// Market data service implementation using Financial Modeling Prep API
    /// Provides real-time and delayed stock prices, market indices, and economic data
    /// </summary>
    public class MarketDataService : IMarketDataService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MarketDataService> _logger;
        private readonly IConfiguration _configuration;
        private readonly string _apiKey;
        private readonly bool _isConfigured;

        private const string BASE_URL = "https://financialmodelingprep.com/api/v3";
        
        // TSP Fund mapping to available symbols (proxies)
        private readonly Dictionary<string, string> _tspFundMapping = new()
        {
            { "G_FUND", "VGIT" },   // Treasury proxy for G Fund
            { "F_FUND", "VBTLX" },  // Total Bond Market proxy for F Fund
            { "C_FUND", "VITSX" },  // S&P 500 proxy for C Fund
            { "S_FUND", "VSMAX" },  // Small Cap proxy for S Fund
            { "I_FUND", "VTIAX" },  // International proxy for I Fund
            { "L_INCOME", "VTINX" },
            { "L_2030", "VTHRX" },
            { "L_2035", "VTTHX" },
            { "L_2040", "VFORX" },
            { "L_2045", "VTIVX" },
            { "L_2050", "VFIFX" },
            { "L_2055", "VFFVX" },
            { "L_2060", "VTTSX" },
            { "L_2065", "VLXVX" },
            { "L_2070", "VSVNX" },
            { "L_2075", "VSZRX" }
        };

        private static string NormalizeTspMappingKey(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return string.Empty;
            var c = code.Trim().ToUpperInvariant();
            return c switch
            {
                "G" => "G_FUND",
                "F" => "F_FUND",
                "C" => "C_FUND",
                "S" => "S_FUND",
                "I" => "I_FUND",
                "LINCOME" or "L-INCOME" => "L_INCOME",
                _ when c.StartsWith("L_") => c,
                _ when c.StartsWith("L") && char.IsDigit(c[1]) => "L_" + c[1..],
                _ => c
            };
        }

        public MarketDataService(HttpClient httpClient, ILogger<MarketDataService> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _configuration = configuration;
            
            _apiKey = _configuration["MarketData:FinancialModelingPrep:ApiKey"] ?? "";
            _isConfigured = !string.IsNullOrEmpty(_apiKey);

            if (!_isConfigured)
            {
                _logger.LogWarning("Financial Modeling Prep API key not configured. Market data will use fallback values.");
            }
            else
            {
                _logger.LogInformation("Market data service initialized with Financial Modeling Prep API");
            }

            // Configure HTTP client
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "PFMP/1.0");
        }

        public async Task<MarketPrice?> GetStockPriceAsync(string symbol)
        {
            try
            {
                if (!_isConfigured)
                {
                    return GenerateFallbackPrice(symbol);
                }

                var url = $"{BASE_URL}/quote/{symbol}?apikey={_apiKey}";
                var response = await _httpClient.GetStringAsync(url);
                var quotes = JsonSerializer.Deserialize<FmpQuote[]>(response);

                if (quotes == null || quotes.Length == 0)
                {
                    _logger.LogWarning("No data returned for symbol {Symbol}", symbol);
                    return GenerateFallbackPrice(symbol);
                }

                var quote = quotes[0];
                return new MarketPrice
                {
                    Symbol = quote.symbol ?? symbol,
                    Price = quote.price,
                    Change = quote.change,
                    ChangePercent = quote.changesPercentage,
                    Volume = quote.volume,
                    DayHigh = quote.dayHigh,
                    DayLow = quote.dayLow,
                    Open = quote.open,
                    PreviousClose = quote.previousClose,
                    LastUpdated = DateTime.UtcNow,
                    Exchange = quote.exchange ?? "",
                    CompanyName = quote.name ?? ""
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error getting stock price for {Symbol}", symbol);
                return GenerateFallbackPrice(symbol);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON parsing error for symbol {Symbol}", symbol);
                return GenerateFallbackPrice(symbol);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error getting stock price for {Symbol}", symbol);
                return GenerateFallbackPrice(symbol);
            }
        }

        public async Task<Dictionary<string, MarketPrice>> GetStockPricesAsync(IEnumerable<string> symbols)
        {
            var results = new Dictionary<string, MarketPrice>();
            var symbolList = symbols.ToList();

            if (!symbolList.Any())
                return results;

            try
            {
                if (!_isConfigured)
                {
                    // Generate fallback prices for all symbols
                    foreach (var symbol in symbolList)
                    {
                        var fallback = GenerateFallbackPrice(symbol);
                        if (fallback != null)
                            results[symbol] = fallback;
                    }
                    return results;
                }

                // Batch request for multiple symbols
                var symbolsParam = string.Join(",", symbolList);
                var url = $"{BASE_URL}/quote/{symbolsParam}?apikey={_apiKey}";
                var response = await _httpClient.GetStringAsync(url);
                var quotes = JsonSerializer.Deserialize<FmpQuote[]>(response);

                if (quotes != null)
                {
                    foreach (var quote in quotes)
                    {
                        if (quote.symbol != null)
                        {
                            results[quote.symbol] = new MarketPrice
                            {
                                Symbol = quote.symbol,
                                Price = quote.price,
                                Change = quote.change,
                                ChangePercent = quote.changesPercentage,
                                Volume = quote.volume,
                                DayHigh = quote.dayHigh,
                                DayLow = quote.dayLow,
                                Open = quote.open,
                                PreviousClose = quote.previousClose,
                                LastUpdated = DateTime.UtcNow,
                                Exchange = quote.exchange ?? "",
                                CompanyName = quote.name ?? ""
                            };
                        }
                    }
                }

                // Add fallback prices for any missing symbols
                foreach (var symbol in symbolList)
                {
                    if (!results.ContainsKey(symbol))
                    {
                        var fallback = GenerateFallbackPrice(symbol);
                        if (fallback != null)
                            results[symbol] = fallback;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting batch stock prices");
                
                // Return fallback prices for all symbols on error
                foreach (var symbol in symbolList)
                {
                    var fallback = GenerateFallbackPrice(symbol);
                    if (fallback != null)
                        results[symbol] = fallback;
                }
            }

            return results;
        }

        public async Task<MarketIndices> GetMarketIndicesAsync()
        {
            try
            {
                var indices = new MarketIndices
                {
                    LastUpdated = DateTime.UtcNow,
                    MarketStatus = GetMarketStatus()
                };

                if (!_isConfigured)
                {
                    // Return fallback market indices
                    indices.SP500 = GenerateFallbackPrice("^GSPC") ?? new MarketPrice { Symbol = "^GSPC", Price = 4200.00m };
                    indices.NASDAQ = GenerateFallbackPrice("^IXIC") ?? new MarketPrice { Symbol = "^IXIC", Price = 13000.00m };
                    indices.DowJones = GenerateFallbackPrice("^DJI") ?? new MarketPrice { Symbol = "^DJI", Price = 34000.00m };
                    indices.Russell2000 = GenerateFallbackPrice("^RUT") ?? new MarketPrice { Symbol = "^RUT", Price = 1900.00m };
                    indices.VIX = GenerateFallbackPrice("^VIX") ?? new MarketPrice { Symbol = "^VIX", Price = 20.00m };
                    return indices;
                }

                var symbols = new[] { "^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX" };
                var prices = await GetStockPricesAsync(symbols);

                indices.SP500 = prices.GetValueOrDefault("^GSPC") ?? GenerateFallbackPrice("^GSPC")!;
                indices.NASDAQ = prices.GetValueOrDefault("^IXIC") ?? GenerateFallbackPrice("^IXIC")!;
                indices.DowJones = prices.GetValueOrDefault("^DJI") ?? GenerateFallbackPrice("^DJI")!;
                indices.Russell2000 = prices.GetValueOrDefault("^RUT") ?? GenerateFallbackPrice("^RUT")!;
                indices.VIX = prices.GetValueOrDefault("^VIX") ?? GenerateFallbackPrice("^VIX")!;

                return indices;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting market indices");
                
                // Return fallback data
                return new MarketIndices
                {
                    SP500 = new MarketPrice { Symbol = "^GSPC", Price = 4200.00m, CompanyName = "S&P 500" },
                    NASDAQ = new MarketPrice { Symbol = "^IXIC", Price = 13000.00m, CompanyName = "NASDAQ Composite" },
                    DowJones = new MarketPrice { Symbol = "^DJI", Price = 34000.00m, CompanyName = "Dow Jones Industrial" },
                    Russell2000 = new MarketPrice { Symbol = "^RUT", Price = 1900.00m, CompanyName = "Russell 2000" },
                    VIX = new MarketPrice { Symbol = "^VIX", Price = 20.00m, CompanyName = "CBOE Volatility Index" },
                    LastUpdated = DateTime.UtcNow,
                    MarketStatus = GetMarketStatus()
                };
            }
        }

        public async Task<Dictionary<string, MarketPrice>> GetTSPFundPricesAsync()
        {
            try
            {
                _logger.LogInformation("Getting TSP fund prices using proxy symbols");
                
                var proxySymbols = _tspFundMapping.Values.ToList();
                var proxyPrices = await GetStockPricesAsync(proxySymbols);
                
                var tspPrices = new Dictionary<string, MarketPrice>();
                
                foreach (var mapping in _tspFundMapping)
                {
                    var tspFund = mapping.Key;
                    var proxySymbol = mapping.Value;
                    
                    if (proxyPrices.TryGetValue(proxySymbol, out var proxyPrice))
                    {
                        // Create TSP fund price based on proxy
                        tspPrices[tspFund] = new MarketPrice
                        {
                            Symbol = tspFund,
                            Price = proxyPrice.Price,
                            Change = proxyPrice.Change,
                            ChangePercent = proxyPrice.ChangePercent,
                            Volume = proxyPrice.Volume,
                            DayHigh = proxyPrice.DayHigh,
                            DayLow = proxyPrice.DayLow,
                            Open = proxyPrice.Open,
                            PreviousClose = proxyPrice.PreviousClose,
                            LastUpdated = DateTime.UtcNow,
                            Exchange = "TSP",
                            CompanyName = GetTSPFundName(tspFund)
                        };
                    }
                    else
                    {
                        // Fallback TSP fund price
                        tspPrices[tspFund] = GenerateFallbackTSPPrice(tspFund);
                    }
                }

                return tspPrices;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting TSP fund prices");
                
                // Return fallback TSP prices
                var fallbackPrices = new Dictionary<string, MarketPrice>();
                foreach (var fund in _tspFundMapping.Keys)
                {
                    fallbackPrices[fund] = GenerateFallbackTSPPrice(fund);
                }
                return fallbackPrices;
            }
        }

        // Exposed for internal callers that may pass UI codes; not part of IMarketDataService contract
        internal MarketPrice? TryGetTspPriceByAnyCode(Dictionary<string, MarketPrice> prices, string code)
        {
            var key = NormalizeTspMappingKey(code);
            return prices.TryGetValue(key, out var v) ? v : null;
        }

        public async Task<EconomicIndicators> GetEconomicIndicatorsAsync()
        {
            try
            {
                var indicators = new EconomicIndicators
                {
                    LastUpdated = DateTime.UtcNow
                };

                if (!_isConfigured)
                {
                    // Return fallback economic indicators
                    return new EconomicIndicators
                    {
                        TreasuryYield10Year = 4.25m,
                        TreasuryYield2Year = 4.50m,
                        DollarIndex = 103.50m,
                        CrudeOilPrice = 75.00m,
                        GoldPrice = 1950.00m,
                        BitcoinPrice = 43000.00m,
                        FedFundsRate = "5.25-5.50%",
                        LastUpdated = DateTime.UtcNow
                    };
                }

                // Get key economic indicators
                var symbols = new[] { "^TNX", "^FVX", "DX-Y.NYB", "CL=F", "GC=F", "BTC-USD" };
                var prices = await GetStockPricesAsync(symbols);

                indicators.TreasuryYield10Year = prices.GetValueOrDefault("^TNX")?.Price ?? 4.25m;
                indicators.TreasuryYield2Year = prices.GetValueOrDefault("^FVX")?.Price ?? 4.50m;
                indicators.DollarIndex = prices.GetValueOrDefault("DX-Y.NYB")?.Price ?? 103.50m;
                indicators.CrudeOilPrice = prices.GetValueOrDefault("CL=F")?.Price ?? 75.00m;
                indicators.GoldPrice = prices.GetValueOrDefault("GC=F")?.Price ?? 1950.00m;
                indicators.BitcoinPrice = prices.GetValueOrDefault("BTC-USD")?.Price ?? 43000.00m;
                indicators.FedFundsRate = "5.25-5.50%"; // This would need a separate API call

                return indicators;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting economic indicators");
                
                // Return fallback data
                return new EconomicIndicators
                {
                    TreasuryYield10Year = 4.25m,
                    TreasuryYield2Year = 4.50m,
                    DollarIndex = 103.50m,
                    CrudeOilPrice = 75.00m,
                    GoldPrice = 1950.00m,
                    BitcoinPrice = 43000.00m,
                    FedFundsRate = "5.25-5.50%",
                    LastUpdated = DateTime.UtcNow
                };
            }
        }

        public async Task<bool> IsServiceAvailableAsync()
        {
            try
            {
                if (!_isConfigured)
                {
                    _logger.LogInformation("Market data service available in fallback mode (no API key)");
                    return true; // Fallback mode is always available
                }

                // Test with a simple API call
                var url = $"{BASE_URL}/quote/AAPL?apikey={_apiKey}";
                using var response = await _httpClient.GetAsync(url);
                
                var isAvailable = response.IsSuccessStatusCode;
                _logger.LogInformation("Market data service availability check: {Status}", 
                    isAvailable ? "Available" : "Unavailable");
                
                return isAvailable;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking market data service availability");
                return false;
            }
        }

        private MarketPrice GenerateFallbackPrice(string symbol)
        {
            // Generate realistic fallback prices for development/testing
            var random = new Random(symbol.GetHashCode()); // Seed with symbol for consistency
            var basePrice = symbol switch
            {
                "AAPL" => 175.00m,
                "MSFT" => 350.00m,
                "GOOGL" => 125.00m,
                "TSLA" => 200.00m,
                "NVDA" => 450.00m,
                "^GSPC" => 4200.00m,
                "^IXIC" => 13000.00m,
                "^DJI" => 34000.00m,
                "^RUT" => 1900.00m,
                "^VIX" => 20.00m,
                _ => 100.00m
            };

            var changePercent = (decimal)(random.NextDouble() * 6 - 3); // -3% to +3%
            var change = basePrice * (changePercent / 100);
            var currentPrice = basePrice + change;

            return new MarketPrice
            {
                Symbol = symbol,
                Price = Math.Round(currentPrice, 2),
                Change = Math.Round(change, 2),
                ChangePercent = Math.Round(changePercent, 2),
                Volume = random.Next(1000000, 50000000),
                DayHigh = Math.Round(currentPrice * 1.02m, 2),
                DayLow = Math.Round(currentPrice * 0.98m, 2),
                Open = Math.Round(basePrice, 2),
                PreviousClose = Math.Round(basePrice, 2),
                LastUpdated = DateTime.UtcNow,
                Exchange = "FALLBACK",
                CompanyName = $"Sample Company ({symbol})"
            };
        }

        private MarketPrice GenerateFallbackTSPPrice(string tspFund)
        {
            var basePrice = tspFund switch
            {
                "G_FUND" => 15.25m,
                "F_FUND" => 12.80m,
                "C_FUND" => 68.45m,
                "S_FUND" => 42.15m,
                "I_FUND" => 35.90m,
                "L_INCOME" => 14.75m,
                "L_2030" => 25.40m,
                "L_2040" => 32.85m,
                "L_2050" => 38.20m,
                "L_2060" => 42.10m,
                "L_2070" => 45.95m,
                _ => 25.00m
            };

            var random = new Random(tspFund.GetHashCode());
            var changePercent = (decimal)(random.NextDouble() * 2 - 1); // -1% to +1%
            var change = basePrice * (changePercent / 100);

            return new MarketPrice
            {
                Symbol = tspFund,
                Price = Math.Round(basePrice + change, 2),
                Change = Math.Round(change, 2),
                ChangePercent = Math.Round(changePercent, 2),
                Volume = 0, // TSP funds don't have traditional volume
                DayHigh = Math.Round(basePrice * 1.01m, 2),
                DayLow = Math.Round(basePrice * 0.99m, 2),
                Open = Math.Round(basePrice, 2),
                PreviousClose = Math.Round(basePrice, 2),
                LastUpdated = DateTime.UtcNow,
                Exchange = "TSP",
                CompanyName = GetTSPFundName(tspFund)
            };
        }

        private string GetTSPFundName(string tspFund)
        {
            return tspFund switch
            {
                "G_FUND" => "Government Securities Investment Fund",
                "F_FUND" => "Fixed Income Index Investment Fund",
                "C_FUND" => "Common Stock Index Investment Fund",
                "S_FUND" => "Small Capitalization Stock Index Investment Fund",
                "I_FUND" => "International Stock Index Investment Fund",
                "L_INCOME" => "Lifecycle Income Fund",
                "L_2030" => "Lifecycle 2030 Fund",
                "L_2040" => "Lifecycle 2040 Fund",
                "L_2050" => "Lifecycle 2050 Fund",
                "L_2060" => "Lifecycle 2060 Fund",
                "L_2070" => "Lifecycle 2070 Fund",
                _ => $"TSP {tspFund} Fund"
            };
        }

        private string GetMarketStatus()
        {
            var now = DateTime.Now;
            var easternTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(now, "Eastern Standard Time");
            
            // Simple market hours check (9:30 AM - 4:00 PM ET, Monday-Friday)
            if (easternTime.DayOfWeek == DayOfWeek.Saturday || easternTime.DayOfWeek == DayOfWeek.Sunday)
                return "CLOSED";
            
            var marketOpen = new TimeSpan(9, 30, 0);
            var marketClose = new TimeSpan(16, 0, 0);
            var currentTime = easternTime.TimeOfDay;

            if (currentTime >= marketOpen && currentTime <= marketClose)
                return "OPEN";
            else if (currentTime < marketOpen)
                return "PRE_MARKET";
            else
                return "AFTER_HOURS";
        }
    }

    /// <summary>
    /// Financial Modeling Prep API quote response model
    /// </summary>
    internal class FmpQuote
    {
        public string? symbol { get; set; }
        public decimal price { get; set; }
        public decimal change { get; set; }
        public decimal changesPercentage { get; set; }
        public decimal volume { get; set; }
        public decimal dayHigh { get; set; }
        public decimal dayLow { get; set; }
        public decimal open { get; set; }
        public decimal previousClose { get; set; }
        public string? exchange { get; set; }
        public string? name { get; set; }
    }
}