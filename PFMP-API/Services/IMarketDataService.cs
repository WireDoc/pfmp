namespace PFMP_API.Services
{
    /// <summary>
    /// Market data service interface for real-time financial data
    /// </summary>
    public interface IMarketDataService
    {
        /// <summary>
        /// Get current stock price for a symbol
        /// </summary>
        /// <param name="symbol">Stock symbol (e.g., "AAPL", "MSFT")</param>
        /// <returns>Current price and metadata</returns>
        Task<MarketPrice?> GetStockPriceAsync(string symbol);

        /// <summary>
        /// Get current prices for multiple symbols
        /// </summary>
        /// <param name="symbols">List of stock symbols</param>
        /// <returns>Dictionary of symbol to price data</returns>
        Task<Dictionary<string, MarketPrice>> GetStockPricesAsync(IEnumerable<string> symbols);

        /// <summary>
        /// Get major market indices (S&P 500, NASDAQ, DOW)
        /// </summary>
        /// <returns>Current market indices data</returns>
        Task<MarketIndices> GetMarketIndicesAsync();

        /// <summary>
        /// Get TSP fund prices (G, F, C, S, I, and lifecycle funds)
        /// </summary>
        /// <returns>Current TSP fund prices</returns>
        Task<Dictionary<string, MarketPrice>> GetTSPFundPricesAsync();

        /// <summary>
        /// Get economic indicators (VIX, 10-year Treasury yield, etc.)
        /// </summary>
        /// <returns>Key economic indicators</returns>
        Task<EconomicIndicators> GetEconomicIndicatorsAsync();

        /// <summary>
        /// Check if market data service is available
        /// </summary>
        /// <returns>Service health status</returns>
        Task<bool> IsServiceAvailableAsync();
    }

    /// <summary>
    /// Market price data model
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
        public string MarketStatus { get; set; } = "UNKNOWN"; // OPEN, CLOSED, PRE_MARKET, AFTER_HOURS
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
}