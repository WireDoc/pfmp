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

            // Fetch related entities from onboarding tables (authoritative data source)
            var cashAccounts = await _context.CashAccounts
                .Where(a => a.UserId == effectiveUserId)
                .ToListAsync();

            var investmentAccounts = await _context.InvestmentAccounts
                .Where(a => a.UserId == effectiveUserId)
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

            // Calculate net worth from onboarding tables only
            var totalCash = cashAccounts.Sum(a => a.Balance);
            var totalInvestments = investmentAccounts.Sum(a => a.CurrentValue);
            
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
            var accounts = new List<object>();

            foreach (var cash in cashAccounts)
            {
                accounts.Add(new
                {
                    id = $"cash_{cash.CashAccountId}",
                    name = cash.Nickname,
                    institution = cash.Institution ?? "Unknown",
                    type = "cash",
                    balance = new { amount = cash.Balance, currency = "USD" },
                    syncStatus = "ok",
                    lastSync = cash.UpdatedAt
                });
            }

            foreach (var inv in investmentAccounts)
            {
                accounts.Add(new
                {
                    id = $"investment_{inv.InvestmentAccountId}",
                    name = inv.AccountName,
                    institution = inv.Institution ?? "Unknown",
                    type = "brokerage",
                    balance = new { amount = inv.CurrentValue, currency = "USD" },
                    syncStatus = "ok",
                    lastSync = inv.UpdatedAt
                });
            }

            if (tspPositions.Any())
            {
                accounts.Add(new
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
                .Where(a => a.InterestRateApr.HasValue && a.InterestRateApr < 4.0m && a.Balance > 5000)
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
                accounts,
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
