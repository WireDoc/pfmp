using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Service for real-time portfolio valuation and performance tracking
    /// </summary>
    public interface IPortfolioValuationService
    {
        /// <summary>
        /// Calculate current total portfolio value for a user
        /// </summary>
        Task<PortfolioValuation> GetCurrentPortfolioValueAsync(int userId);

        /// <summary>
        /// Get detailed account valuations with current market prices
        /// </summary>
        Task<List<AccountValuation>> GetAccountValuationsAsync(int userId);

        /// <summary>
        /// Update holdings with current market prices
        /// </summary>
        Task UpdateHoldingPricesAsync(int userId);

        /// <summary>
        /// Calculate portfolio performance metrics
        /// </summary>
        Task<PortfolioPerformance> GetPortfolioPerformanceAsync(int userId);

        /// <summary>
        /// Get net worth summary including all assets
        /// </summary>
        Task<NetWorthSummary> GetNetWorthSummaryAsync(int userId);
    }

    /// <summary>
    /// Portfolio valuation service implementation
    /// </summary>
    public class PortfolioValuationService : IPortfolioValuationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMarketDataService _marketDataService;
        private readonly TSPService _tspService;
        private readonly ILogger<PortfolioValuationService> _logger;

        public PortfolioValuationService(
            ApplicationDbContext context,
            IMarketDataService marketDataService,
            TSPService tspService,
            ILogger<PortfolioValuationService> logger)
        {
            _context = context;
            _marketDataService = marketDataService;
            _tspService = tspService;
            _logger = logger;
        }

        public async Task<PortfolioValuation> GetCurrentPortfolioValueAsync(int userId)
        {
            try
            {
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId && a.IsActive)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                var valuation = new PortfolioValuation
                {
                    UserId = userId,
                    ValuationDate = DateTime.UtcNow
                };

                // Update holdings with current market prices first
                await UpdateHoldingPricesAsync(userId);

                // Calculate total values
                foreach (var account in accounts)
                {
                    var accountValue = account.CurrentBalance;

                    // Add holdings value
                    if (account.Holdings?.Any() == true)
                    {
                        var holdingsValue = account.Holdings.Sum(h => h.Quantity * h.CurrentPrice);
                        accountValue += holdingsValue;
                    }

                    // Categorize by account type
                    switch (account.Category)
                    {
                        case AccountCategory.Taxable:
                            valuation.TaxableValue += accountValue;
                            break;
                        case AccountCategory.TaxDeferred:
                            valuation.TaxDeferredValue += accountValue;
                            break;
                        case AccountCategory.TaxFree:
                            valuation.TaxFreeValue += accountValue;
                            break;
                        case AccountCategory.TaxAdvantaged:
                            valuation.TaxAdvantaged += accountValue;
                            break;
                        case AccountCategory.Cash:
                            valuation.CashValue += accountValue;
                            break;
                        case AccountCategory.Cryptocurrency:
                            valuation.CryptocurrencyValue += accountValue;
                            break;
                        case AccountCategory.RealEstate:
                            valuation.RealEstateValue += accountValue;
                            break;
                        case AccountCategory.Alternative:
                            valuation.AlternativeValue += accountValue;
                            break;
                    }
                }

                // Calculate totals
                valuation.TotalPortfolioValue = valuation.TaxableValue + valuation.TaxDeferredValue + 
                    valuation.TaxFreeValue + valuation.TaxAdvantaged + valuation.CashValue + 
                    valuation.CryptocurrencyValue + valuation.RealEstateValue + valuation.AlternativeValue;

                valuation.InvestmentValue = valuation.TaxableValue + valuation.TaxDeferredValue + 
                    valuation.TaxFreeValue + valuation.TaxAdvantaged;

                return valuation;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating portfolio value for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<AccountValuation>> GetAccountValuationsAsync(int userId)
        {
            try
            {
                var accounts = await _context.Accounts
                    .Where(a => a.UserId == userId && a.IsActive)
                    .Include(a => a.Holdings)
                    .ToListAsync();

                // Update holdings with current market prices
                await UpdateHoldingPricesAsync(userId);

                var valuations = new List<AccountValuation>();

                foreach (var account in accounts)
                {
                    var valuation = new AccountValuation
                    {
                        AccountId = account.AccountId,
                        AccountName = account.AccountName,
                        AccountType = account.AccountType,
                        Institution = account.Institution ?? "",
                        CashBalance = account.CurrentBalance,
                        ValuationDate = DateTime.UtcNow,
                        Holdings = new List<HoldingValuation>()
                    };

                    // Calculate holdings values
                    if (account.Holdings?.Any() == true)
                    {
                        foreach (var holding in account.Holdings)
                        {
                            var holdingValuation = new HoldingValuation
                            {
                                Symbol = holding.Symbol,
                                Quantity = holding.Quantity,
                                CurrentPrice = holding.CurrentPrice,
                                CurrentValue = holding.CurrentValue,
                                PurchasePrice = holding.AverageCostBasis,
                                PurchaseValue = holding.TotalCostBasis,
                                UnrealizedGainLoss = holding.UnrealizedGainLoss,
                                GainLossPercentage = holding.UnrealizedGainLossPercentage,
                                LastPriceUpdate = holding.LastPriceUpdate
                            };

                            valuation.Holdings.Add(holdingValuation);
                            valuation.HoldingsValue += holdingValuation.CurrentValue;
                        }
                    }

                    valuation.TotalValue = valuation.CashBalance + valuation.HoldingsValue;
                    valuations.Add(valuation);
                }

                return valuations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account valuations for user {UserId}", userId);
                throw;
            }
        }

        public async Task UpdateHoldingPricesAsync(int userId)
        {
            try
            {
                var holdings = await _context.Holdings
                    .Include(h => h.Account)
                    .Where(h => h.Account.UserId == userId)
                    .ToListAsync();

                if (!holdings.Any())
                    return;

                // Get unique symbols
                var symbols = holdings.Select(h => h.Symbol).Distinct().ToList();
                
                // Get current prices
                var currentPrices = await _marketDataService.GetStockPricesAsync(symbols);

                // Get TSP fund prices from DailyTSP if any TSP accounts exist
                var tspHoldings = holdings.Where(h => h.Account.AccountType == AccountType.TSP).ToList();
                Dictionary<string, decimal>? tspPrices = null;
                if (tspHoldings.Any())
                {
                    tspPrices = await _tspService.GetTSPPricesAsDictionaryAsync();
                }

                // Update holding prices
                foreach (var holding in holdings)
                {
                    decimal? price = null;

                    // Check if it's a TSP fund first
                    if (holding.Account.AccountType == AccountType.TSP && tspPrices != null)
                    {
                        var normalizedCode = TSPService.NormalizeFundCode(holding.Symbol);
                        if (tspPrices.TryGetValue(normalizedCode, out var tspPrice))
                        {
                            price = tspPrice;
                        }
                    }
                    else if (currentPrices.TryGetValue(holding.Symbol, out var marketPrice))
                    {
                        price = marketPrice.Price;
                    }

                    if (price.HasValue)
                    {
                        holding.CurrentPrice = price.Value;
                        holding.LastPriceUpdate = DateTime.UtcNow;
                    }
                    else
                    {
                        _logger.LogWarning("No price data found for symbol {Symbol}", holding.Symbol);
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Updated {Count} holdings for user {UserId}", holdings.Count, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating holding prices for user {UserId}", userId);
                throw;
            }
        }

        public async Task<PortfolioPerformance> GetPortfolioPerformanceAsync(int userId)
        {
            try
            {
                var currentValuation = await GetCurrentPortfolioValueAsync(userId);
                var accountValuations = await GetAccountValuationsAsync(userId);

                var performance = new PortfolioPerformance
                {
                    UserId = userId,
                    AsOfDate = DateTime.UtcNow,
                    CurrentValue = currentValuation.TotalPortfolioValue
                };

                // Calculate total gains/losses from holdings
                foreach (var account in accountValuations)
                {
                    foreach (var holding in account.Holdings)
                    {
                        performance.TotalGainLoss += holding.UnrealizedGainLoss;
                        performance.TotalInvestedAmount += holding.PurchaseValue;
                    }
                }

                // Calculate performance metrics
                if (performance.TotalInvestedAmount > 0)
                {
                    performance.TotalReturnPercentage = (performance.TotalGainLoss / performance.TotalInvestedAmount) * 100;
                }

                // Calculate allocation percentages
                if (currentValuation.TotalPortfolioValue > 0)
                {
                    performance.StockAllocation = ((currentValuation.TaxableValue + currentValuation.TaxDeferredValue) / currentValuation.TotalPortfolioValue) * 100;
                    performance.CashAllocation = (currentValuation.CashValue / currentValuation.TotalPortfolioValue) * 100;
                    performance.AlternativeAllocation = ((currentValuation.CryptocurrencyValue + currentValuation.RealEstateValue + currentValuation.AlternativeValue) / currentValuation.TotalPortfolioValue) * 100;
                }

                return performance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating portfolio performance for user {UserId}", userId);
                throw;
            }
        }

        public async Task<NetWorthSummary> GetNetWorthSummaryAsync(int userId)
        {
            try
            {
                var portfolioValuation = await GetCurrentPortfolioValueAsync(userId);
                var user = await _context.Users.FindAsync(userId);

                var netWorth = new NetWorthSummary
                {
                    UserId = userId,
                    AsOfDate = DateTime.UtcNow,
                    
                    // Assets
                    InvestmentAssets = portfolioValuation.InvestmentValue,
                    CashAssets = portfolioValuation.CashValue,
                    RealEstateAssets = portfolioValuation.RealEstateValue,
                    CryptocurrencyAssets = portfolioValuation.CryptocurrencyValue,
                    OtherAssets = portfolioValuation.AlternativeValue,
                    
                    // TODO: Add liabilities from debt tracking
                    TotalLiabilities = 0
                };

                netWorth.TotalAssets = netWorth.InvestmentAssets + netWorth.CashAssets + 
                    netWorth.RealEstateAssets + netWorth.CryptocurrencyAssets + netWorth.OtherAssets;

                netWorth.NetWorth = netWorth.TotalAssets - netWorth.TotalLiabilities;

                // Add income information if available
                if (user != null)
                {
                    netWorth.AnnualIncome = user.AnnualIncome ?? 0;
                    if (user.VADisabilityMonthlyAmount.HasValue)
                    {
                        netWorth.AnnualIncome += user.VADisabilityMonthlyAmount.Value * 12;
                    }
                }

                return netWorth;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating net worth for user {UserId}", userId);
                throw;
            }
        }
    }

    #region Data Models

    /// <summary>
    /// Portfolio valuation summary
    /// </summary>
    public class PortfolioValuation
    {
        public int UserId { get; set; }
        public DateTime ValuationDate { get; set; }
        public decimal TotalPortfolioValue { get; set; }
        public decimal InvestmentValue { get; set; }
        
        // By tax treatment
        public decimal TaxableValue { get; set; }
        public decimal TaxDeferredValue { get; set; }
        public decimal TaxFreeValue { get; set; }
        public decimal TaxAdvantaged { get; set; }
        
        // By asset type
        public decimal CashValue { get; set; }
        public decimal CryptocurrencyValue { get; set; }
        public decimal RealEstateValue { get; set; }
        public decimal AlternativeValue { get; set; }
    }

    /// <summary>
    /// Individual account valuation
    /// </summary>
    public class AccountValuation
    {
        public int AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public AccountType AccountType { get; set; }
        public string Institution { get; set; } = string.Empty;
        public decimal CashBalance { get; set; }
        public decimal HoldingsValue { get; set; }
        public decimal TotalValue { get; set; }
        public DateTime ValuationDate { get; set; }
        public List<HoldingValuation> Holdings { get; set; } = new();
    }

    /// <summary>
    /// Individual holding valuation
    /// </summary>
    public class HoldingValuation
    {
        public string Symbol { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal CurrentPrice { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal PurchaseValue { get; set; }
        public decimal UnrealizedGainLoss { get; set; }
        public decimal GainLossPercentage { get; set; }
        public DateTime? LastPriceUpdate { get; set; }
    }

    /// <summary>
    /// Portfolio performance metrics
    /// </summary>
    public class PortfolioPerformance
    {
        public int UserId { get; set; }
        public DateTime AsOfDate { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal TotalInvestedAmount { get; set; }
        public decimal TotalGainLoss { get; set; }
        public decimal TotalReturnPercentage { get; set; }
        
        // Allocation percentages
        public decimal StockAllocation { get; set; }
        public decimal CashAllocation { get; set; }
        public decimal AlternativeAllocation { get; set; }
    }

    /// <summary>
    /// Complete net worth summary
    /// </summary>
    public class NetWorthSummary
    {
        public int UserId { get; set; }
        public DateTime AsOfDate { get; set; }
        
        // Assets
        public decimal InvestmentAssets { get; set; }
        public decimal CashAssets { get; set; }
        public decimal RealEstateAssets { get; set; }
        public decimal CryptocurrencyAssets { get; set; }
        public decimal OtherAssets { get; set; }
        public decimal TotalAssets { get; set; }
        
        // Liabilities (future expansion)
        public decimal TotalLiabilities { get; set; }
        
        // Net Worth
        public decimal NetWorth { get; set; }
        
        // Income (for context)
        public decimal AnnualIncome { get; set; }
    }

    #endregion
}