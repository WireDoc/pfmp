using Microsoft.Extensions.Options;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace PFMP_API.Services.MarketData;

/// <summary>
/// Financial Modeling Prep API service for market data
/// Supports stocks, ETFs, cryptocurrencies, and more
/// </summary>
public class FmpMarketDataService : IMarketDataService
{
    private readonly HttpClient _httpClient;
    private readonly FmpOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FmpMarketDataService> _logger;
    private const int CacheMinutes = 1; // Cache quotes for 1 minute

    public FmpMarketDataService(
        HttpClient httpClient,
        IOptions<FmpOptions> options,
        IMemoryCache cache,
        ILogger<FmpMarketDataService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get real-time quote for a single symbol
    /// </summary>
    public async Task<FmpQuote?> GetQuoteAsync(string symbol)
    {
        var cacheKey = $"quote_{symbol}";
        if (_cache.TryGetValue<FmpQuote>(cacheKey, out var cachedQuote))
        {
            _logger.LogDebug("Returning cached quote for {Symbol}", symbol);
            return cachedQuote;
        }

        try
        {
            var url = $"{_options.BaseUrl}/quote/{symbol}?apikey={_options.ApiKey}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for symbol {Symbol}", response.StatusCode, symbol);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var quotes = JsonSerializer.Deserialize<List<FmpQuote>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var quote = quotes?.FirstOrDefault();
            if (quote != null)
            {
                _cache.Set(cacheKey, quote, TimeSpan.FromMinutes(CacheMinutes));
            }

            return quote;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching quote for {Symbol}", symbol);
            return null;
        }
    }

    /// <summary>
    /// Get real-time quotes for multiple symbols (bulk operation)
    /// </summary>
    public async Task<List<FmpQuote>> GetQuotesAsync(List<string> symbols)
    {
        if (!symbols.Any())
        {
            return new List<FmpQuote>();
        }

        var results = new List<FmpQuote>();
        var uncachedSymbols = new List<string>();

        // Check cache first
        foreach (var symbol in symbols)
        {
            var cacheKey = $"quote_{symbol}";
            if (_cache.TryGetValue<FmpQuote>(cacheKey, out var cachedQuote))
            {
                results.Add(cachedQuote);
            }
            else
            {
                uncachedSymbols.Add(symbol);
            }
        }

        if (!uncachedSymbols.Any())
        {
            _logger.LogDebug("All {Count} quotes returned from cache", symbols.Count);
            return results;
        }

        try
        {
            // FMP supports comma-separated symbols for bulk quotes
            var symbolList = string.Join(",", uncachedSymbols);
            var url = $"{_options.BaseUrl}/quote/{symbolList}?apikey={_options.ApiKey}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for bulk quotes", response.StatusCode);
                return results;
            }

            var content = await response.Content.ReadAsStringAsync();
            var quotes = JsonSerializer.Deserialize<List<FmpQuote>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (quotes != null)
            {
                foreach (var quote in quotes.Where(q => q != null))
                {
                    var cacheKey = $"quote_{quote.Symbol}";
                    _cache.Set(cacheKey, quote, TimeSpan.FromMinutes(CacheMinutes));
                    results.Add(quote);
                }
            }

            _logger.LogInformation("Fetched {Count} quotes from FMP API", quotes?.Count ?? 0);
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching bulk quotes");
            return results;
        }
    }

    /// <summary>
    /// Get historical prices for a symbol
    /// </summary>
    public async Task<List<FmpHistoricalPrice>> GetHistoricalPricesAsync(string symbol, DateTime? from = null, DateTime? to = null)
    {
        try
        {
            var url = $"{_options.BaseUrl}/historical-price-full/{symbol}?apikey={_options.ApiKey}";
            
            if (from.HasValue)
            {
                url += $"&from={from.Value:yyyy-MM-dd}";
            }
            
            if (to.HasValue)
            {
                url += $"&to={to.Value:yyyy-MM-dd}";
            }

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for historical data {Symbol}", response.StatusCode, symbol);
                return new List<FmpHistoricalPrice>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<FmpHistoricalResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result?.Historical ?? new List<FmpHistoricalPrice>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching historical prices for {Symbol}", symbol);
            return new List<FmpHistoricalPrice>();
        }
    }

    /// <summary>
    /// Get company profile and details
    /// </summary>
    public async Task<FmpCompanyProfile?> GetCompanyProfileAsync(string symbol)
    {
        var cacheKey = $"profile_{symbol}";
        if (_cache.TryGetValue<FmpCompanyProfile>(cacheKey, out var cachedProfile))
        {
            return cachedProfile;
        }

        try
        {
            var url = $"{_options.BaseUrl}/profile/{symbol}?apikey={_options.ApiKey}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for profile {Symbol}", response.StatusCode, symbol);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var profiles = JsonSerializer.Deserialize<List<FmpCompanyProfile>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var profile = profiles?.FirstOrDefault();
            if (profile != null)
            {
                // Cache company profiles for 24 hours (they don't change often)
                _cache.Set(cacheKey, profile, TimeSpan.FromHours(24));
            }

            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching company profile for {Symbol}", symbol);
            return null;
        }
    }

    /// <summary>
    /// Get intraday prices (5min, 15min, 1hour, 4hour candles) for a symbol
    /// FMP returns a flat array for intraday charts
    /// </summary>
    public async Task<List<FmpHistoricalPrice>> GetIntradayPricesAsync(string symbol, string interval = "5min")
    {
        try
        {
            var url = $"{_options.BaseUrl}/historical-chart/{interval}/{symbol}?apikey={_options.ApiKey}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for intraday data {Symbol}", response.StatusCode, symbol);
                return new List<FmpHistoricalPrice>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<List<FmpIntradayPrice>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null) return new List<FmpHistoricalPrice>();

            // Map to same FmpHistoricalPrice model
            return result
                .Where(p => DateTime.TryParse(p.Date, out _))
                .Select(p => new FmpHistoricalPrice
                {
                    Date = DateTime.Parse(p.Date),
                    Open = p.Open,
                    High = p.High,
                    Low = p.Low,
                    Close = p.Close,
                    Volume = (long)p.Volume
                }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching intraday prices for {Symbol}", symbol);
            return new List<FmpHistoricalPrice>();
        }
    }

    // Helper class for deserializing intraday data (flat array with string date)
    private class FmpIntradayPrice
    {
        public string Date { get; set; } = "";
        public decimal Open { get; set; }
        public decimal High { get; set; }
        public decimal Low { get; set; }
        public decimal Close { get; set; }
        public decimal Volume { get; set; }
    }

    // Helper class for deserializing historical data response
    private class FmpHistoricalResponse
    {
        public string? Symbol { get; set; }
        public List<FmpHistoricalPrice>? Historical { get; set; }
    }

    /// <summary>
    /// Get major market indices (S&P 500, NASDAQ, DOW, Russell 2000, VIX)
    /// </summary>
    public async Task<MarketIndices> GetMarketIndicesAsync()
    {
        try
        {
            var indices = new MarketIndices
            {
                LastUpdated = DateTime.UtcNow,
                MarketStatus = GetMarketStatus()
            };

            var symbols = new List<string> { "^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX" };
            var quotes = await GetQuotesAsync(symbols);
            var lookup = quotes.ToDictionary(q => q.Symbol, q => q);

            indices.SP500 = QuoteToMarketPrice(lookup.GetValueOrDefault("^GSPC"), "^GSPC", "S&P 500");
            indices.NASDAQ = QuoteToMarketPrice(lookup.GetValueOrDefault("^IXIC"), "^IXIC", "NASDAQ Composite");
            indices.DowJones = QuoteToMarketPrice(lookup.GetValueOrDefault("^DJI"), "^DJI", "Dow Jones Industrial");
            indices.Russell2000 = QuoteToMarketPrice(lookup.GetValueOrDefault("^RUT"), "^RUT", "Russell 2000");
            indices.VIX = QuoteToMarketPrice(lookup.GetValueOrDefault("^VIX"), "^VIX", "CBOE Volatility Index");

            return indices;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting market indices");
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

    /// <summary>
    /// Get economic indicators (Treasury yields, commodities, crypto)
    /// </summary>
    public async Task<EconomicIndicators> GetEconomicIndicatorsAsync()
    {
        try
        {
            var symbols = new List<string> { "^TNX", "^FVX", "DX-Y.NYB", "CL=F", "GC=F", "BTC-USD" };
            var quotes = await GetQuotesAsync(symbols);
            var lookup = quotes.ToDictionary(q => q.Symbol, q => q);

            return new EconomicIndicators
            {
                TreasuryYield10Year = lookup.GetValueOrDefault("^TNX")?.Price ?? 4.25m,
                TreasuryYield2Year = lookup.GetValueOrDefault("^FVX")?.Price ?? 4.50m,
                DollarIndex = lookup.GetValueOrDefault("DX-Y.NYB")?.Price ?? 103.50m,
                CrudeOilPrice = lookup.GetValueOrDefault("CL=F")?.Price ?? 75.00m,
                GoldPrice = lookup.GetValueOrDefault("GC=F")?.Price ?? 1950.00m,
                BitcoinPrice = lookup.GetValueOrDefault("BTC-USD")?.Price ?? 43000.00m,
                FedFundsRate = "5.25-5.50%",
                LastUpdated = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting economic indicators");
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

    /// <summary>
    /// Check if market data service is available
    /// </summary>
    public async Task<bool> IsServiceAvailableAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(_options.ApiKey))
            {
                _logger.LogInformation("Market data service available in fallback mode (no API key)");
                return true;
            }

            var url = $"{_options.BaseUrl}/quote/AAPL?apikey={_options.ApiKey}";
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

    /// <summary>
    /// Get stock prices as a dictionary (adapter for consumers needing MarketPrice objects)
    /// </summary>
    public async Task<Dictionary<string, MarketPrice>> GetStockPricesAsync(IEnumerable<string> symbols)
    {
        var symbolList = symbols.ToList();
        if (!symbolList.Any())
            return new Dictionary<string, MarketPrice>();

        var quotes = await GetQuotesAsync(symbolList);
        return quotes.ToDictionary(
            q => q.Symbol,
            q => QuoteToMarketPrice(q, q.Symbol, q.Name)
        );
    }

    /// <summary>
    /// Get ETF sector weightings — returns the investment sectors of the ETF's holdings,
    /// not the fund issuer's sector. Uses /etf-sector-weightings/{symbol}.
    /// </summary>
    public async Task<List<FmpEtfSectorWeighting>> GetEtfSectorWeightingsAsync(string symbol)
    {
        var cacheKey = $"etf_sector_{symbol}";
        if (_cache.TryGetValue<List<FmpEtfSectorWeighting>>(cacheKey, out var cached))
            return cached!;

        try
        {
            var url = $"{_options.BaseUrl}/etf-sector-weightings/{symbol}?apikey={_options.ApiKey}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for ETF sector weightings {Symbol}", response.StatusCode, symbol);
                return new List<FmpEtfSectorWeighting>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<List<FmpEtfSectorWeighting>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<FmpEtfSectorWeighting>();

            _cache.Set(cacheKey, result, TimeSpan.FromHours(24));
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ETF sector weightings for {Symbol}", symbol);
            return new List<FmpEtfSectorWeighting>();
        }
    }

    /// <summary>
    /// Get ETF country weightings — returns the geographic breakdown of the ETF's holdings.
    /// Uses /etf-country-weightings/{symbol}.
    /// </summary>
    public async Task<List<FmpEtfCountryWeighting>> GetEtfCountryWeightingsAsync(string symbol)
    {
        var cacheKey = $"etf_country_{symbol}";
        if (_cache.TryGetValue<List<FmpEtfCountryWeighting>>(cacheKey, out var cached))
            return cached!;

        try
        {
            var url = $"{_options.BaseUrl}/etf-country-weightings/{symbol}?apikey={_options.ApiKey}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for ETF country weightings {Symbol}", response.StatusCode, symbol);
                return new List<FmpEtfCountryWeighting>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<List<FmpEtfCountryWeighting>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<FmpEtfCountryWeighting>();

            _cache.Set(cacheKey, result, TimeSpan.FromHours(24));
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ETF country weightings for {Symbol}", symbol);
            return new List<FmpEtfCountryWeighting>();
        }
    }

    private static MarketPrice QuoteToMarketPrice(FmpQuote? quote, string symbol, string fallbackName = "")
    {
        if (quote == null)
        {
            return new MarketPrice
            {
                Symbol = symbol,
                CompanyName = fallbackName,
                LastUpdated = DateTime.UtcNow
            };
        }

        return new MarketPrice
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
        };
    }

    private static string GetMarketStatus()
    {
        var now = DateTime.Now;
        var easternTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(now, "Eastern Standard Time");

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
