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

    // Helper class for deserializing historical data response
    private class FmpHistoricalResponse
    {
        public string? Symbol { get; set; }
        public List<FmpHistoricalPrice>? Historical { get; set; }
    }
}
