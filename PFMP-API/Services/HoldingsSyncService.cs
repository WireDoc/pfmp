using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Service to synchronize Holdings table with Transactions.
    /// Holdings are the source of truth for current positions.
    /// Transactions update holdings automatically.
    /// </summary>
    public class HoldingsSyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<HoldingsSyncService> _logger;

        public HoldingsSyncService(ApplicationDbContext context, ILogger<HoldingsSyncService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get or create a holding for a symbol. Used when adding transactions.
        /// </summary>
        public async Task<Holding> GetOrCreateHoldingAsync(int accountId, string symbol, string? name = null, AssetType? assetType = null)
        {
            var holding = await _context.Holdings
                .FirstOrDefaultAsync(h => h.AccountId == accountId && h.Symbol == symbol);

            if (holding == null)
            {
                _logger.LogInformation("Creating new holding for {Symbol} in account {AccountId}", symbol, accountId);
                
                holding = new Holding
                {
                    AccountId = accountId,
                    Symbol = symbol,
                    Name = name ?? symbol,
                    AssetType = assetType ?? InferAssetType(symbol),
                    Quantity = 0,
                    AverageCostBasis = 0,
                    CurrentPrice = 0,
                    IsQualifiedDividend = false,
                    IsLongTermCapitalGains = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Holdings.Add(holding);
                await _context.SaveChangesAsync();
            }

            return holding;
        }

        /// <summary>
        /// Update holding quantity and cost basis after a transaction.
        /// Call this after adding Buy, Sell, DRIP, Split, etc.
        /// </summary>
        public async Task UpdateHoldingFromTransactionsAsync(int holdingId)
        {
            var holding = await _context.Holdings
                .Include(h => h.Transactions)
                .FirstOrDefaultAsync(h => h.HoldingId == holdingId);

            if (holding == null)
            {
                _logger.LogWarning("Holding {HoldingId} not found for update", holdingId);
                return;
            }

            var transactions = holding.Transactions.OrderBy(t => t.TransactionDate).ToList();

            decimal totalQuantity = 0;
            decimal totalCost = 0;
            DateTime? earliestPurchase = null;

            foreach (var txn in transactions)
            {
                switch (txn.TransactionType.ToUpperInvariant())
                {
                    case "BUY":
                    case "INITIAL_BALANCE":
                    case "DIVIDEND_REINVEST":
                        if (txn.Quantity.HasValue && txn.Price.HasValue)
                        {
                            totalQuantity += txn.Quantity.Value;
                            totalCost += txn.Quantity.Value * txn.Price.Value;
                            
                            if (earliestPurchase == null || txn.TransactionDate < earliestPurchase)
                                earliestPurchase = txn.TransactionDate;
                        }
                        break;

                    case "SELL":
                        if (txn.Quantity.HasValue)
                        {
                            totalQuantity -= txn.Quantity.Value;
                            // For sells, reduce cost proportionally (FIFO/Average cost)
                            if (totalQuantity > 0 && totalCost > 0)
                            {
                                // Proportional cost reduction
                                var soldProportion = txn.Quantity.Value / (totalQuantity + txn.Quantity.Value);
                                totalCost -= totalCost * soldProportion;
                            }
                            else if (totalQuantity <= 0)
                            {
                                totalCost = 0; // Sold everything
                            }
                        }
                        break;

                    case "SPLIT":
                        if (txn.Quantity.HasValue)
                        {
                            // Split multiplies quantity but doesn't change total cost
                            // txn.Quantity should be the multiplier (e.g., 10 for 10-for-1 split)
                            var splitRatio = txn.Quantity.Value;
                            totalQuantity *= splitRatio;
                            // Cost basis per share divides by split ratio
                        }
                        break;

                    case "SPINOFF":
                        // Spinoffs are complex - may need to adjust cost basis
                        // For now, just add the quantity
                        if (txn.Quantity.HasValue && txn.Price.HasValue)
                        {
                            totalQuantity += txn.Quantity.Value;
                            // Spinoffs typically don't add to cost basis initially
                        }
                        break;

                    case "TRANSFER":
                        // Transfers should adjust quantity based on amount
                        if (txn.Quantity.HasValue && txn.Price.HasValue)
                        {
                            totalQuantity += txn.Quantity.Value;
                            totalCost += txn.Quantity.Value * txn.Price.Value;
                        }
                        break;
                }
            }

            // Update the holding
            holding.Quantity = totalQuantity;
            holding.AverageCostBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0;
            holding.PurchaseDate = earliestPurchase;
            holding.UpdatedAt = DateTime.UtcNow;

            // Update tax status based on holding period
            if (earliestPurchase.HasValue)
            {
                var holdingPeriod = DateTime.UtcNow - earliestPurchase.Value;
                holding.IsLongTermCapitalGains = holdingPeriod.TotalDays > 365;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Updated holding {HoldingId} ({Symbol}): Quantity={Quantity}, AvgCost={AvgCost}",
                holding.HoldingId, holding.Symbol, holding.Quantity, holding.AverageCostBasis);
        }

        /// <summary>
        /// Rebuild all holdings from transactions for an account.
        /// Useful for onboarding or fixing sync issues.
        /// </summary>
        public async Task RebuildHoldingsFromTransactionsAsync(int accountId)
        {
            _logger.LogInformation("Rebuilding holdings from transactions for account {AccountId}", accountId);

            // Get all holdings for this account
            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .ToListAsync();

            foreach (var holding in holdings)
            {
                await UpdateHoldingFromTransactionsAsync(holding.HoldingId);
            }

            // Remove holdings with zero quantity
            var zeroHoldings = holdings.Where(h => h.Quantity == 0).ToList();
            if (zeroHoldings.Any())
            {
                _logger.LogInformation("Removing {Count} holdings with zero quantity", zeroHoldings.Count);
                _context.Holdings.RemoveRange(zeroHoldings);
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Infer asset type from symbol format
        /// </summary>
        private AssetType InferAssetType(string symbol)
        {
            if (symbol.EndsWith("-USD") || symbol.Contains("BTC") || symbol.Contains("ETH"))
                return AssetType.Cryptocurrency;

            if (symbol.StartsWith("TSP"))
                return symbol switch
                {
                    "TSPG" => AssetType.TSPGFund,
                    "TSPF" => AssetType.TSPFFund,
                    "TSPC" => AssetType.TSPCFund,
                    "TSPS" => AssetType.TSPSFund,
                    "TSPI" => AssetType.TSPIFund,
                    _ => AssetType.TSPLifecycleFund
                };

            // Default to stock/ETF
            return AssetType.Stock;
        }
    }
}
