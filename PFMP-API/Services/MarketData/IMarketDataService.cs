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
    public decimal? Volume { get; set; }
    public decimal? AvgVolume { get; set; }
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
/// Market price data model (adapter for API responses)
/// </summary>
public class MarketPrice
{
    public string Symbol { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Change { get; set; }
    public decimal ChangePercent { get; set; }
    public decimal Volume { get; set; }
    public decimal DayHigh { get; set; }
    public decimal DayLow { get; set; }
    public decimal Open { get; set; }
    public decimal PreviousClose { get; set; }
    public DateTime LastUpdated { get; set; }
    public string Exchange { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
}

/// <summary>
/// Major market indices data
/// </summary>
public class MarketIndices
{
    public MarketPrice SP500 { get; set; } = new();
    public MarketPrice NASDAQ { get; set; } = new();
    public MarketPrice DowJones { get; set; } = new();
    public MarketPrice Russell2000 { get; set; } = new();
    public MarketPrice VIX { get; set; } = new();
    public DateTime LastUpdated { get; set; }
    public string MarketStatus { get; set; } = "UNKNOWN";
}

/// <summary>
/// Economic indicators data
/// </summary>
public class EconomicIndicators
{
    public decimal TreasuryYield10Year { get; set; }
    public decimal TreasuryYield2Year { get; set; }
    public decimal DollarIndex { get; set; }
    public decimal CrudeOilPrice { get; set; }
    public decimal GoldPrice { get; set; }
    public decimal BitcoinPrice { get; set; }
    public string FedFundsRate { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
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

/// <summary>
/// Service interface for market data operations
/// </summary>
public interface IMarketDataService
{
    Task<FmpQuote?> GetQuoteAsync(string symbol);
    Task<List<FmpQuote>> GetQuotesAsync(List<string> symbols);
    Task<List<FmpHistoricalPrice>> GetHistoricalPricesAsync(string symbol, DateTime? from = null, DateTime? to = null);
    Task<FmpCompanyProfile?> GetCompanyProfileAsync(string symbol);
    Task<MarketIndices> GetMarketIndicesAsync();
    Task<EconomicIndicators> GetEconomicIndicatorsAsync();
    Task<bool> IsServiceAvailableAsync();

    /// <summary>
    /// Get stock prices as a dictionary (adapter for legacy consumers)
    /// </summary>
    Task<Dictionary<string, MarketPrice>> GetStockPricesAsync(IEnumerable<string> symbols);
}
