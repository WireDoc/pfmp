using PFMP_API.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Text.Json;

namespace PFMP_API.Services;

/// <summary>
/// Service for fetching and caching benchmark data (S&P 500, Nasdaq, etc.)
/// </summary>
public class BenchmarkDataService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BenchmarkDataService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    // In-memory cache for benchmark data (24-hour TTL)
    private static Dictionary<string, (DateTime FetchedAt, List<PriceHistory> Data)> _cache = new();
    private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromHours(24);

    public BenchmarkDataService(
        ApplicationDbContext context,
        ILogger<BenchmarkDataService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    /// <summary>
    /// Get benchmark historical data with caching
    /// </summary>
    public async Task<List<PriceHistory>> GetBenchmarkHistoryAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        try
        {
            var cacheKey = $"{symbol}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";

            // Check cache first
            if (_cache.TryGetValue(cacheKey, out var cachedData))
            {
                if (DateTime.UtcNow - cachedData.FetchedAt < CACHE_DURATION)
                {
                    _logger.LogInformation("Returning cached benchmark data for {Symbol}", symbol);
                    return cachedData.Data;
                }
                else
                {
                    // Remove expired cache entry
                    _cache.Remove(cacheKey);
                }
            }

            // Check database first
            var dbData = await _context.PriceHistory
                .Where(p => p.Symbol == symbol && p.Date >= startDate && p.Date <= endDate)
                .OrderBy(p => p.Date)
                .ToListAsync();

            if (dbData.Any() && dbData.Count > (endDate - startDate).TotalDays * 0.8) // At least 80% coverage
            {
                _cache[cacheKey] = (DateTime.UtcNow, dbData);
                return dbData;
            }

            // Fetch from FMP API
            var freshData = await FetchFromFMPApiAsync(symbol, startDate, endDate);

            if (freshData.Any())
            {
                // Save to database
                await SaveToDatabase(freshData);

                // Update cache
                _cache[cacheKey] = (DateTime.UtcNow, freshData);

                return freshData;
            }

            // Fallback to whatever we have in DB
            return dbData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching benchmark data for {Symbol}", symbol);
            throw;
        }
    }

    /// <summary>
    /// Fetch historical data from Financial Modeling Prep API
    /// </summary>
    private async Task<List<PriceHistory>> FetchFromFMPApiAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        try
        {
            var apiKey = _configuration["FMP:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("FMP API key not configured");
                return new List<PriceHistory>();
            }

            var client = _httpClientFactory.CreateClient();
            var url = $"https://financialmodelingprep.com/api/v3/historical-price-full/{symbol}" +
                     $"?from={startDate:yyyy-MM-dd}&to={endDate:yyyy-MM-dd}&apikey={apiKey}";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FMP API returned {StatusCode} for {Symbol}", response.StatusCode, symbol);
                return new List<PriceHistory>();
            }

            var content = await response.Content.ReadAsStringAsync();
            var fmpResponse = JsonSerializer.Deserialize<FMPHistoricalResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (fmpResponse?.Historical == null)
            {
                return new List<PriceHistory>();
            }

            // Convert to PriceHistory entities
            var priceHistory = fmpResponse.Historical.Select(h => new PriceHistory
            {
                Symbol = symbol,
                Date = DateTime.Parse(h.Date),
                Open = h.Open,
                High = h.High,
                Low = h.Low,
                Close = h.Close,
                Volume = h.Volume,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            return priceHistory;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching data from FMP API for {Symbol}", symbol);
            return new List<PriceHistory>();
        }
    }

    /// <summary>
    /// Save price history to database
    /// </summary>
    private async Task SaveToDatabase(List<PriceHistory> priceHistory)
    {
        try
        {
            foreach (var price in priceHistory)
            {
                // Check if already exists
                var exists = await _context.PriceHistory
                    .AnyAsync(p => p.Symbol == price.Symbol && p.Date == price.Date);

                if (!exists)
                {
                    _context.PriceHistory.Add(price);
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving price history to database");
            // Don't throw - caching failure shouldn't break the application
        }
    }

    /// <summary>
    /// Calculate benchmark returns for comparison
    /// </summary>
    public async Task<decimal> CalculateBenchmarkReturnAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        try
        {
            var priceHistory = await GetBenchmarkHistoryAsync(symbol, startDate, endDate);

            if (priceHistory.Count < 2)
            {
                return 0;
            }

            var startPrice = priceHistory.First().Close;
            var endPrice = priceHistory.Last().Close;

            if (startPrice == 0)
            {
                return 0;
            }

            return ((endPrice - startPrice) / startPrice) * 100;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating benchmark return for {Symbol}", symbol);
            return 0;
        }
    }

    /// <summary>
    /// Get benchmark data for multiple indices
    /// </summary>
    public async Task<Dictionary<string, decimal>> GetBenchmarkReturnsAsync(DateTime startDate, DateTime endDate)
    {
        var benchmarks = new Dictionary<string, decimal>();

        var symbols = new[] { "SPY", "QQQ", "IWM", "VTI", "AGG", "VEU" };

        foreach (var symbol in symbols)
        {
            var benchmarkReturn = await CalculateBenchmarkReturnAsync(symbol, startDate, endDate);
            benchmarks[symbol] = benchmarkReturn;
        }

        return benchmarks;
    }
}

/// <summary>
/// FMP API response model
/// </summary>
internal class FMPHistoricalResponse
{
    public string? Symbol { get; set; }
    public List<FMPHistoricalDataPoint>? Historical { get; set; }
}

/// <summary>
/// FMP API historical data point
/// </summary>
internal class FMPHistoricalDataPoint
{
    public string Date { get; set; } = string.Empty;
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long Volume { get; set; }
}
