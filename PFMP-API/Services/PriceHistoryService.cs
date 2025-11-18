using PFMP_API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace PFMP_API.Services;

/// <summary>
/// Service for fetching and managing historical price data for any symbol
/// </summary>
public class PriceHistoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PriceHistoryService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public PriceHistoryService(
        ApplicationDbContext context,
        ILogger<PriceHistoryService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    /// <summary>
    /// Get price history for a symbol, fetching from API if not in database
    /// </summary>
    public async Task<List<PriceHistory>> GetPriceHistoryAsync(string symbol, DateTime startDate, DateTime endDate)
    {
        // First check database
        var existingData = await _context.PriceHistory
            .Where(p => p.Symbol == symbol && p.Date >= startDate && p.Date <= endDate)
            .OrderBy(p => p.Date)
            .ToListAsync();

        // If we have data for the full range, return it
        var expectedDays = (endDate - startDate).Days;
        if (existingData.Count >= expectedDays * 0.7) // Allow for weekends/holidays
        {
            _logger.LogInformation("Found {Count} price records for {Symbol} in database", existingData.Count, symbol);
            return existingData;
        }

        // Otherwise fetch from API
        _logger.LogInformation("Fetching price history for {Symbol} from FMP API", symbol);
        var apiData = await FetchFromApiAsync(symbol, startDate, endDate);

        if (apiData.Count > 0)
        {
            await SaveToDatabase(apiData);
            return apiData;
        }

        // Return whatever we have if API fails
        return existingData;
    }

    /// <summary>
    /// Get price history for multiple symbols
    /// </summary>
    public async Task<Dictionary<string, List<PriceHistory>>> GetPriceHistoryBatchAsync(
        List<string> symbols, 
        DateTime startDate, 
        DateTime endDate)
    {
        var result = new Dictionary<string, List<PriceHistory>>();

        foreach (var symbol in symbols.Distinct())
        {
            var history = await GetPriceHistoryAsync(symbol, startDate, endDate);
            result[symbol] = history;
        }

        return result;
    }

    /// <summary>
    /// Fetch historical prices from FMP API
    /// </summary>
    private async Task<List<PriceHistory>> FetchFromApiAsync(string symbol, DateTime startDate, DateTime endDate)
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

            if (fmpResponse?.Historical == null || fmpResponse.Historical.Count == 0)
            {
                _logger.LogWarning("No historical data returned from FMP for {Symbol}", symbol);
                return new List<PriceHistory>();
            }

            // Convert to PriceHistory entities
            var priceHistory = fmpResponse.Historical.Select(h => new PriceHistory
            {
                Symbol = symbol,
                Date = DateTime.SpecifyKind(DateTime.Parse(h.Date), DateTimeKind.Utc),
                Open = h.Open,
                High = h.High,
                Low = h.Low,
                Close = h.Close,
                Volume = h.Volume,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _logger.LogInformation("Fetched {Count} price records for {Symbol} from FMP", priceHistory.Count, symbol);
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
            _logger.LogInformation("Saved {Count} new price records to database", priceHistory.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving price history to database");
        }
    }

    /// <summary>
    /// Backfill missing price data for holdings in an account
    /// </summary>
    public async Task<int> BackfillAccountPriceHistoryAsync(int accountId, DateTime? startDate = null)
    {
        var account = await _context.Accounts
            .Include(a => a.Holdings)
            .FirstOrDefaultAsync(a => a.AccountId == accountId);

        if (account == null)
        {
            return 0;
        }

        var symbols = account.Holdings.Select(h => h.Symbol).Distinct().ToList();
        var start = startDate ?? DateTime.UtcNow.AddYears(-1);
        var end = DateTime.UtcNow;

        var totalRecords = 0;
        foreach (var symbol in symbols)
        {
            var history = await GetPriceHistoryAsync(symbol, start, end);
            totalRecords += history.Count;
        }

        _logger.LogInformation("Backfilled {Count} price records for account {AccountId}", totalRecords, accountId);
        return totalRecords;
    }
}
