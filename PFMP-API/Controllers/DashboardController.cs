using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services;
using PFMP_API.Services.FinancialProfile;

namespace PFMP_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DashboardController> _logger;
    private readonly TSPService _tspService;

    public DashboardController(
        ApplicationDbContext context,
        ILogger<DashboardController> logger,
        TSPService tspService)
    {
        _context = context;
        _logger = logger;
        _tspService = tspService;
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

            // Fetch all accounts from unified Accounts table
            var accounts = await _context.Accounts
                .Where(a => a.UserId == effectiveUserId)
                .Include(a => a.Holdings)
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
            var cashAccounts = accounts.Where(a => 
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
            
            var totalCash = cashAccounts.Sum(a => a.CurrentBalance);
            var totalInvestments = investmentAccounts.Sum(a => a.CurrentBalance);
            
            // Calculate TSP with current market prices from DailyTSP API
            decimal totalTsp = 0;
            if (tspPositions.Any(p => p.Units > 0))
            {
                var tspData = await _tspService.GetTSPDataAsync();
                if (tspData != null)
                {
                    foreach (var position in tspPositions.Where(p => p.Units > 0))
                    {
                        var price = GetTspFundPrice(tspData, position.FundCode);
                        if (price.HasValue)
                        {
                            totalTsp += position.Units * price.Value;
                        }
                    }
                }
            }
            
            var totalProperties = properties.Sum(p => p.EstimatedValue);
            
            var totalAssets = totalCash + totalInvestments + totalTsp + totalProperties;

            var totalLiabilities = liabilities.Sum(l => l.CurrentBalance) + 
                                 properties.Sum(p => p.MortgageBalance ?? 0);
            
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
                .Where(a => a.InterestRate.HasValue && a.InterestRate < 0.04m && a.CurrentBalance > 5000)
                .ToList();

            if (lowYieldAccounts.Any())
            {
                var totalLowYield = lowYieldAccounts.Sum(a => a.CurrentBalance);
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
                name = l.LiabilityType,
                type = l.LiabilityType ?? "Other",
                currentBalance = new { amount = l.CurrentBalance, currency = "USD" },
                minimumPayment = new { amount = l.MinimumPayment ?? 0, currency = "USD" },
                interestRate = l.InterestRateApr,
                lastUpdated = l.UpdatedAt
            }).ToList();

            // Add mortgages from properties as liabilities if they have balances
            var mortgageIdOffset = 100000; // Use large offset to avoid ID collision
            var mortgageIndex = 0;
            foreach (var property in properties.Where(p => p.MortgageBalance.HasValue && p.MortgageBalance > 0))
            {
                liabilitiesList.Add(new
                {
                    id = mortgageIdOffset + mortgageIndex++,
                    name = $"Mortgage - {property.PropertyName ?? "Property"}",
                    type = "Mortgage",
                    currentBalance = new { amount = property.MortgageBalance!.Value, currency = "USD" },
                    minimumPayment = new { amount = property.MonthlyMortgagePayment ?? 0, currency = "USD" },
                    interestRate = (decimal?)null,
                    lastUpdated = property.UpdatedAt
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

    private static decimal? GetTspFundPrice(TSPModel tspData, string fundCode)
    {
        var code = fundCode.Trim().ToUpperInvariant();
        
        return code switch
        {
            "G" => (decimal)tspData.GFund,
            "F" => (decimal)tspData.FFund,
            "C" => (decimal)tspData.CFund,
            "S" => (decimal)tspData.SFund,
            "I" => (decimal)tspData.IFund,
            "L-INCOME" or "LINCOME" => (decimal)tspData.LIncome,
            "L2030" => (decimal)tspData.L2030,
            "L2035" => (decimal)tspData.L2035,
            "L2040" => (decimal)tspData.L2040,
            "L2045" => (decimal)tspData.L2045,
            "L2050" => (decimal)tspData.L2050,
            "L2055" => (decimal)tspData.L2055,
            "L2060" => (decimal)tspData.L2060,
            "L2065" => (decimal)tspData.L2065,
            "L2070" => (decimal)tspData.L2070,
            "L2075" => (decimal)tspData.L2075,
            _ => null
        };
    }
}
