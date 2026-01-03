namespace PFMP_API.Services.MarketData;

/// <summary>
/// Configuration options for Financial Modeling Prep API
/// </summary>
public class FmpOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://financialmodelingprep.com/api/v3";
}

/// <summary>
/// Real-time quote data from FMP
/// </summary>
public class FmpQuote
{
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Change { get; set; }
    public decimal ChangesPercentage { get; set; }
    public decimal? DayLow { get; set; }
    public decimal? DayHigh { get; set; }
    public decimal? YearHigh { get; set; }
    public decimal? YearLow { get; set; }
    public decimal? MarketCap { get; set; }
    public long? Volume { get; set; }
    public long? AvgVolume { get; set; }
    public string Exchange { get; set; } = string.Empty;
    public decimal? Open { get; set; }
    public decimal? PreviousClose { get; set; }
    public decimal? Eps { get; set; }
    public decimal? Pe { get; set; }
    public long Timestamp { get; set; }
}

/// <summary>
/// Historical price data from FMP
/// </summary>
public class FmpHistoricalPrice
{
    public DateTime Date { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long Volume { get; set; }
    public decimal? AdjClose { get; set; }
    public decimal? Change { get; set; }
    public decimal? ChangePercent { get; set; }
}

/// <summary>
/// Company profile from FMP
/// </summary>
public class FmpCompanyProfile
{
    public string Symbol { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Sector { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal? Beta { get; set; }
    public decimal? DividendYield { get; set; }
    public string? LastDiv { get; set; }
    public string? Website { get; set; }
    public string? Description { get; set; }
    public string? Ceo { get; set; }
    public string? Image { get; set; }
}

/// <summary>
/// Service interface for market data operations
/// </summary>
public interface IMarketDataService
{
    Task<FmpQuote?> GetQuoteAsync(string symbol);
    Task<List<FmpQuote>> GetQuotesAsync(List<string> symbols);
    Task<List<FmpHistoricalPrice>> GetHistoricalPricesAsync(string symbol, DateTime? from = null, DateTime? to = null);
    Task<FmpCompanyProfile?> GetCompanyProfileAsync(string symbol);
}
