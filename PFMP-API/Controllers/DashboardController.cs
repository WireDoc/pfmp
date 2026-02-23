using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services.FinancialProfile;
using PFMP_API.Services.MarketData;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DashboardController> _logger;
    private readonly IMarketDataService? _marketDataService;
    
    /// <summary>
    /// Staleness threshold for automatic price refresh.
    /// Holdings with LastPriceUpdate older than this will be refreshed on dashboard load.
    /// </summary>
    private static readonly TimeSpan PriceStalenessThreshold = TimeSpan.FromHours(4);

    public DashboardController(
        ApplicationDbContext context,
        ILogger<DashboardController> logger,
        IMarketDataService? marketDataService = null)
    {
        _context = context;
        _logger = logger;
        _marketDataService = marketDataService;
    }

    /// <summary>
    /// Get comprehensive dashboard summary including net worth, accounts, and insights
    /// </summary>
    /// <param name="userId">User ID (optional; defaults to current user in auth context)</param>
    /// <returns>Dashboard summary data</returns>
    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetSummary([FromQuery] int? userId = null)
    {
        try
        {
            // For now, use provided userId or default to user 1 (dev bypass mode)
            // TODO: Extract from auth context when MSAL is fully enabled
            var effectiveUserId = userId ?? 1;

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == effectiveUserId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Fetch all accounts from unified Accounts table (exclude cash - they use CashAccounts table)
            var accounts = await _context.Accounts
                .Where(a => a.UserId == effectiveUserId &&
                           a.AccountType != AccountType.Checking &&
                           a.AccountType != AccountType.Savings &&
                           a.AccountType != AccountType.MoneyMarket &&
                           a.AccountType != AccountType.CertificateOfDeposit)
                .Include(a => a.Holdings)
                .ToListAsync();

            // Auto-refresh stale prices for investment holdings
            await RefreshStalePricesAsync(accounts);

            // Fetch cash accounts from separate CashAccounts table
            var cashAccounts = await _context.CashAccounts
                .Where(ca => ca.UserId == effectiveUserId)
                .ToListAsync();

            var tspPositions = await _context.TspLifecyclePositions
                .Where(p => p.UserId == effectiveUserId)
                .ToListAsync();

            var properties = await _context.Properties
                .Where(p => p.UserId == effectiveUserId)
                .ToListAsync();

            var liabilities = await _context.LiabilityAccounts
                .Where(l => l.UserId == effectiveUserId)
                .ToListAsync();

            // Calculate net worth from new unified Accounts table
            var oldCashAccountsToDelete = accounts.Where(a => 
                a.AccountType == AccountType.Checking || 
                a.AccountType == AccountType.Savings || 
                a.AccountType == AccountType.MoneyMarket ||
                a.AccountType == AccountType.CertificateOfDeposit).ToList();
                
            var investmentAccounts = accounts.Where(a => 
                a.AccountType == AccountType.Brokerage || 
                a.AccountType == AccountType.RetirementAccountIRA || 
                a.AccountType == AccountType.RetirementAccount401k || 
                a.AccountType == AccountType.RetirementAccountRoth ||
                a.AccountType == AccountType.HSA).ToList();
            
            var totalCash = cashAccounts.Sum(a => a.Balance);
            var totalInvestments = investmentAccounts.Sum(a => a.CurrentBalance);
            
            // Calculate TSP with cached prices from TSPFundPrices table (updated by Hangfire job)
            decimal totalTsp = 0;
            if (tspPositions.Any(p => p.Units > 0))
            {
                var cachedPrices = await _context.TSPFundPrices
                    .OrderByDescending(p => p.PriceDate)
                    .FirstOrDefaultAsync();
                    
                if (cachedPrices != null)
                {
                    foreach (var position in tspPositions.Where(p => p.Units > 0))
                    {
                        var price = GetCachedTspFundPrice(cachedPrices, position.FundCode);
                        if (price.HasValue)
                        {
                            totalTsp += position.Units * price.Value;
                        }
                    }
                }
            }
            
            var totalProperties = properties.Sum(p => p.EstimatedValue);
            
            var totalAssets = totalCash + totalInvestments + totalTsp + totalProperties;

            // Avoid double-counting: only add property mortgage balances when the property
            // is NOT already linked to a LiabilityAccount record.
            var unlinkedPropertyMortgages = properties
                .Where(p => p.MortgageBalance.HasValue && p.MortgageBalance > 0 && !p.LinkedMortgageLiabilityId.HasValue)
                .Sum(p => p.MortgageBalance!.Value);
            var totalLiabilities = liabilities.Sum(l => l.CurrentBalance) + unlinkedPropertyMortgages;
            
            var netWorth = totalAssets - totalLiabilities;

            // Build accounts list
            var accountsList = new List<object>();

            foreach (var acct in accounts)
            {
                // Map account type to frontend expected types
                var displayType = acct.AccountType switch
                {
                    AccountType.Checking or AccountType.Savings or AccountType.MoneyMarket or AccountType.CertificateOfDeposit => "cash",
                    AccountType.Brokerage => "brokerage",
                    AccountType.RetirementAccountIRA or AccountType.RetirementAccount401k or AccountType.RetirementAccountRoth or AccountType.HSA => "investment",
                    AccountType.TSP => "retirement",
                    AccountType.CryptocurrencyExchange or AccountType.CryptocurrencyWallet => "crypto",
                    _ => acct.AccountType.ToString().ToLower()
                };

                accountsList.Add(new
                {
                    id = acct.AccountId,  // Use integer AccountId for navigation
                    name = acct.AccountName,
                    institution = acct.Institution ?? "Unknown",
                    type = displayType,
                    accountType = acct.AccountType.ToString(),  // Include specific type
                    balance = new { amount = acct.CurrentBalance, currency = "USD" },
                    holdingsCount = acct.Holdings?.Count ?? 0,
                    syncStatus = "ok",
                    lastSync = acct.UpdatedAt
                });
            }

            // Add cash accounts from CashAccounts table with UUID identifiers
            foreach (var cashAcct in cashAccounts)
            {
                accountsList.Add(new
                {
                    id = cashAcct.CashAccountId.ToString(),  // UUID as string
                    name = cashAcct.Nickname ?? $"{cashAcct.AccountType} Account",
                    institution = cashAcct.Institution ?? "Unknown",
                    type = "cash",
                    accountType = cashAcct.AccountType,
                    balance = new { amount = cashAcct.Balance, currency = "USD" },
                    holdingsCount = 0,  // Cash accounts don't have holdings
                    syncStatus = "ok",
                    lastSync = cashAcct.UpdatedAt,
                    isCashAccount = true  // Flag to indicate this uses UUID-based routing
                });
            }

            if (tspPositions.Any())
            {
                accountsList.Add(new
                {
                    id = "tsp_aggregate",
                    name = "Thrift Savings Plan",
                    institution = "TSP",
                    type = "retirement",
                    balance = new { amount = totalTsp, currency = "USD" },
                    syncStatus = "ok",
                    lastSync = tspPositions.Max(p => p.DateUpdated) ?? DateTime.UtcNow
                });
            }

            // Build insights
            var insights = new List<object>();
            
            var cashPercentage = totalAssets > 0 ? (totalCash / totalAssets * 100) : 0;
            if (cashPercentage < 5 && totalAssets > 10000)
            {
                insights.Add(new
                {
                    id = "insight_cash_low",
                    category = "liquidity",
                    title = "Low cash reserves",
                    body = $"Cash represents only {cashPercentage:F1}% of total assets. Consider maintaining 3-6 months of expenses in liquid accounts.",
                    severity = "info",
                    generatedAt = DateTime.UtcNow
                });
            }

            var lowYieldAccounts = cashAccounts
                .Where(a => a.InterestRateApr.HasValue && a.InterestRateApr < 0.04m && a.Balance > 5000)
                .ToList();

            if (lowYieldAccounts.Any())
            {
                var totalLowYield = lowYieldAccounts.Sum(a => a.Balance);
                insights.Add(new
                {
                    id = "insight_yield_opportunity",
                    category = "cash_optimization",
                    title = "Cash yield opportunity",
                    body = $"${totalLowYield:N0} in accounts earning under 4% APY. High-yield savings accounts currently offer 4.5%+.",
                    severity = "info",
                    generatedAt = DateTime.UtcNow
                });
            }

            // Build properties list
            var propertyList = properties.Select(p => new
            {
                id = p.PropertyId,
                address = p.PropertyName ?? "Unknown Property",
                type = p.PropertyType ?? "Residence",
                estimatedValue = new { amount = p.EstimatedValue, currency = "USD" },
                mortgageBalance = new { amount = p.MortgageBalance ?? 0, currency = "USD" },
                lastUpdated = p.UpdatedAt
            }).ToList();

            // Build liabilities list (includes standalone liabilities + mortgages from properties)
            var liabilitiesList = liabilities.Select(l => new
            {
                id = l.LiabilityAccountId,
                name = l.Lender ?? l.LiabilityType,
                type = l.LiabilityType ?? "Other",
                currentBalance = new { amount = l.CurrentBalance, currency = "USD" },
                minimumPayment = new { amount = l.MinimumPayment ?? 0, currency = "USD" },
                interestRate = l.InterestRateApr,
                lastUpdated = l.UpdatedAt,
                propertyId = (Guid?)null  // Not a property mortgage
            }).ToList();

            // Add mortgages from properties as liabilities ONLY if the property is NOT already
            // linked to a LiabilityAccount (which would already appear in the list above).
            var mortgageIdOffset = 100000; // Use large offset to avoid ID collision
            var mortgageIndex = 0;
            foreach (var property in properties.Where(p => p.MortgageBalance.HasValue && p.MortgageBalance > 0 && !p.LinkedMortgageLiabilityId.HasValue))
            {
                liabilitiesList.Add(new
                {
                    id = mortgageIdOffset + mortgageIndex++,
                    name = $"Mortgage - {property.PropertyName ?? "Property"}",
                    type = "Mortgage",
                    currentBalance = new { amount = property.MortgageBalance!.Value, currency = "USD" },
                    minimumPayment = new { amount = property.MonthlyMortgagePayment ?? 0, currency = "USD" },
                    interestRate = (decimal?)null,
                    lastUpdated = property.UpdatedAt,
                    propertyId = (Guid?)property.PropertyId  // Link to the property
                });
            }

            // Long-term obligations
            var obligations = await _context.LongTermObligations
                .Where(o => o.UserId == effectiveUserId)
                .ToListAsync();

            var summary = new
            {
                netWorth = new
                {
                    totalAssets = new { amount = totalAssets, currency = "USD" },
                    totalLiabilities = new { amount = totalLiabilities, currency = "USD" },
                    netWorth = new { amount = netWorth, currency = "USD" },
                    change1dPct = 0.0m,  // Placeholder - need historical data
                    change30dPct = 0.0m,  // Placeholder - need historical data
                    lastUpdated = DateTime.UtcNow
                },
                accounts = accountsList,  // Use renamed variable
                properties = propertyList,
                liabilities = liabilitiesList,
                insights,
                longTermObligationCount = obligations.Count,
                longTermObligationEstimate = obligations.Sum(o => o.EstimatedCost ?? 0),
                nextObligationDueDate = obligations
                    .Where(o => o.TargetDate.HasValue)
                    .OrderBy(o => o.TargetDate)
                    .Select(o => o.TargetDate)
                    .FirstOrDefault()
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating dashboard summary for user {UserId}", userId);
            return StatusCode(500, new { message = "Internal server error while building dashboard summary" });
        }
    }

    private static decimal? GetCachedTspFundPrice(TSPFundPrice cachedPrices, string fundCode)
    {
        var code = fundCode.Trim().ToUpperInvariant();
        
        return code switch
        {
            "G" => cachedPrices.GFundPrice,
            "F" => cachedPrices.FFundPrice,
            "C" => cachedPrices.CFundPrice,
            "S" => cachedPrices.SFundPrice,
            "I" => cachedPrices.IFundPrice,
            "L-INCOME" or "LINCOME" => cachedPrices.LIncomeFundPrice,
            "L2030" => cachedPrices.L2030FundPrice,
            "L2035" => cachedPrices.L2035FundPrice,
            "L2040" => cachedPrices.L2040FundPrice,
            "L2045" => cachedPrices.L2045FundPrice,
            "L2050" => cachedPrices.L2050FundPrice,
            "L2055" => cachedPrices.L2055FundPrice,
            "L2060" => cachedPrices.L2060FundPrice,
            "L2065" => cachedPrices.L2065FundPrice,
            "L2070" => cachedPrices.L2070FundPrice,
            "L2075" => cachedPrices.L2075FundPrice,
            _ => null
        };
    }

    /// <summary>
    /// Check for stale prices and refresh from market data if needed.
    /// A holding is considered stale if LastPriceUpdate is null or older than PriceStalenessThreshold.
    /// </summary>
    private async Task RefreshStalePricesAsync(List<Account> accounts)
    {
        if (_marketDataService == null)
        {
            _logger.LogDebug("Market data service not available, skipping staleness check");
            return;
        }

        var now = DateTime.UtcNow;
        var staleThreshold = now - PriceStalenessThreshold;

        // Collect all stale holdings across all accounts
        var staleHoldings = accounts
            .SelectMany(a => a.Holdings ?? Enumerable.Empty<Holding>())
            .Where(h => !string.IsNullOrWhiteSpace(h.Symbol))
            .Where(h => !IsTspFund(h.Symbol)) // TSP funds use separate job
            .Where(h => h.LastPriceUpdate == null || h.LastPriceUpdate < staleThreshold)
            .ToList();

        if (staleHoldings.Count == 0)
        {
            _logger.LogDebug("No stale holdings found, prices are fresh");
            return;
        }

        // Get unique symbols to fetch
        var symbols = staleHoldings
            .Select(h => h.Symbol!.ToUpperInvariant())
            .Distinct()
            .ToList();

        _logger.LogInformation(
            "Found {StaleCount} stale holdings across {SymbolCount} symbols, refreshing prices",
            staleHoldings.Count, symbols.Count);

        try
        {
            // Batch fetch all prices
            var quotes = await _marketDataService.GetQuotesAsync(symbols);
            var priceMap = quotes
                .Where(q => q.Price > 0)
                .ToDictionary(q => q.Symbol.ToUpperInvariant(), q => q.Price, StringComparer.OrdinalIgnoreCase);

            _logger.LogInformation("Fetched {PriceCount} prices from market data", priceMap.Count);

            // Update holdings with new prices
            int updatedCount = 0;
            var accountsToUpdate = new HashSet<Account>();

            foreach (var holding in staleHoldings)
            {
                var symbol = holding.Symbol!.ToUpperInvariant();
                if (priceMap.TryGetValue(symbol, out var newPrice))
                {
                    holding.CurrentPrice = newPrice;
                    holding.LastPriceUpdate = now;
                    holding.UpdatedAt = now;
                    updatedCount++;
                    
                    // Track parent account for balance recalculation
                    var account = accounts.FirstOrDefault(a => a.Holdings?.Contains(holding) == true);
                    if (account != null)
                    {
                        accountsToUpdate.Add(account);
                    }
                }
            }

            // Recalculate account balances
            foreach (var account in accountsToUpdate)
            {
                var newBalance = account.Holdings?
                    .Sum(h => h.Quantity * h.CurrentPrice) ?? 0;
                account.CurrentBalance = newBalance;
                account.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Dashboard auto-refresh complete: {UpdatedCount} holdings updated, {AccountCount} account balances recalculated",
                updatedCount, accountsToUpdate.Count);
        }
        catch (Exception ex)
        {
            // Log but don't fail the dashboard - stale data is better than no data
            _logger.LogWarning(ex, "Failed to auto-refresh stale prices, continuing with cached data");
        }
    }

    /// <summary>
    /// Check if a symbol is a TSP fund (handled by separate TspPriceRefreshJob)
    /// </summary>
    private static bool IsTspFund(string? symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return false;
        var s = symbol.Trim().ToUpperInvariant();
        return s is "G" or "F" or "C" or "S" or "I" 
            or "L-INCOME" or "LINCOME"
            or "L2030" or "L2035" or "L2040" or "L2045" or "L2050" 
            or "L2055" or "L2060" or "L2065" or "L2070" or "L2075";
    }
}
