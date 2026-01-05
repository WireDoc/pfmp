using PFMP_API.Models;
using PFMP_API.Models.Analytics;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Services;

/// <summary>
/// Service for calculating tax insights including unrealized gains/losses and harvesting opportunities
/// </summary>
public class TaxInsightsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TaxInsightsService> _logger;

    // Default tax rates (user configurable in future)
    private const decimal SHORT_TERM_TAX_RATE = 0.24m; // 24% ordinary income
    private const decimal LONG_TERM_TAX_RATE = 0.15m; // 15% capital gains

    public TaxInsightsService(
        ApplicationDbContext context,
        ILogger<TaxInsightsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Calculate comprehensive tax insights for an account
    /// </summary>
    public async Task<TaxInsights> CalculateTaxInsightsAsync(int accountId)
    {
        try
        {
            var holdings = await _context.Holdings
                .Where(h => h.AccountId == accountId)
                .ToListAsync();

            var holdingTaxDetails = new List<HoldingTaxDetail>();
            decimal shortTermGains = 0;
            decimal longTermGains = 0;
            decimal shortTermCostBasis = 0;
            decimal longTermCostBasis = 0;

            foreach (var holding in holdings)
            {
                var detail = await CalculateHoldingTaxDetailAsync(holding);
                holdingTaxDetails.Add(detail);

                if (detail.TaxType == "shortTerm")
                {
                    shortTermGains += detail.GainLoss;
                    shortTermCostBasis += detail.CostBasis;
                }
                else
                {
                    longTermGains += detail.GainLoss;
                    longTermCostBasis += detail.CostBasis;
                }
            }

            var totalGains = shortTermGains + longTermGains;
            var totalCostBasis = shortTermCostBasis + longTermCostBasis;

            return new TaxInsights
            {
                UnrealizedGains = new UnrealizedGainsSummary
                {
                    ShortTerm = new ReturnValue
                    {
                        Dollar = shortTermGains,
                        Percent = shortTermCostBasis != 0 ? (shortTermGains / shortTermCostBasis) * 100 : 0
                    },
                    LongTerm = new ReturnValue
                    {
                        Dollar = longTermGains,
                        Percent = longTermCostBasis != 0 ? (longTermGains / longTermCostBasis) * 100 : 0
                    },
                    Total = new ReturnValue
                    {
                        Dollar = totalGains,
                        Percent = totalCostBasis != 0 ? (totalGains / totalCostBasis) * 100 : 0
                    }
                },
                Holdings = holdingTaxDetails.OrderByDescending(h => Math.Abs(h.GainLoss)).ToList(),
                HarvestingOpportunities = IdentifyHarvestingOpportunities(holdingTaxDetails),
                EstimatedTaxLiability = CalculateEstimatedTaxLiability(shortTermGains, longTermGains)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating tax insights for account {AccountId}", accountId);
            throw;
        }
    }

    /// <summary>
    /// Calculate tax details for a single holding
    /// </summary>
    private async Task<HoldingTaxDetail> CalculateHoldingTaxDetailAsync(Holding holding)
    {
        var costBasis = holding.TotalCostBasis;
        var currentValue = holding.CurrentValue;
        var gainLoss = holding.UnrealizedGainLoss;
        var percentGain = holding.UnrealizedGainLossPercentage;

        // Determine holding period - prioritize:
        // 1. Explicit PurchaseDate on holding
        // 2. Earliest buy transaction date
        // 3. Holding CreatedAt as fallback
        DateTime purchaseDate;
        if (holding.PurchaseDate.HasValue)
        {
            purchaseDate = holding.PurchaseDate.Value;
        }
        else
        {
            // Look up earliest buy transaction for this holding
            var earliestBuyTransaction = await _context.Transactions
                .Where(t => t.HoldingId == holding.HoldingId && 
                           (t.TransactionType == "BUY" || t.TransactionType == "Buy"))
                .OrderBy(t => t.TransactionDate)
                .FirstOrDefaultAsync();
            
            purchaseDate = earliestBuyTransaction?.TransactionDate ?? holding.CreatedAt;
        }
        var holdingPeriodDays = (DateTime.UtcNow - purchaseDate).Days;
        var holdingPeriodYears = holdingPeriodDays / 365.25;

        string holdingPeriod;
        var months = holdingPeriodDays / 30;
        if (holdingPeriodYears >= 1)
        {
            holdingPeriod = holdingPeriodYears < 1.05 ? "1.0 year" : $"{holdingPeriodYears:F1} years";
        }
        else if (holdingPeriodDays >= 30)
        {
            holdingPeriod = months == 1 ? "1 month" : $"{months} months";
        }
        else
        {
            holdingPeriod = holdingPeriodDays == 1 ? "1 day" : $"{holdingPeriodDays} days";
        }

        // Tax type: short-term (<1 year) or long-term (>=1 year)
        var taxType = holdingPeriodDays >= 365 ? "longTerm" : "shortTerm";

        return new HoldingTaxDetail
        {
            Symbol = holding.Symbol,
            Name = holding.Name ?? holding.Symbol,
            CostBasis = costBasis,
            CurrentValue = currentValue,
            GainLoss = gainLoss,
            PercentGain = percentGain,
            HoldingPeriod = holdingPeriod,
            TaxType = taxType,
            PurchaseDate = purchaseDate
        };
    }

    /// <summary>
    /// Identify tax-loss harvesting opportunities
    /// </summary>
    private List<HarvestingOpportunity> IdentifyHarvestingOpportunities(List<HoldingTaxDetail> holdings)
    {
        var opportunities = new List<HarvestingOpportunity>();

        foreach (var holding in holdings)
        {
            // Only consider positions with losses > $500
            if (holding.GainLoss >= -500)
            {
                continue;
            }

            // Calculate potential tax savings
            var taxRate = holding.TaxType == "shortTerm" ? SHORT_TERM_TAX_RATE : LONG_TERM_TAX_RATE;
            var taxSavings = Math.Abs(holding.GainLoss) * taxRate;

            // Suggest replacement ETF to avoid wash sale
            var replacement = SuggestReplacementSecurity(holding.Symbol);

            opportunities.Add(new HarvestingOpportunity
            {
                Symbol = holding.Symbol,
                Loss = holding.GainLoss,
                HoldingPeriod = holding.HoldingPeriod,
                TaxSavings = taxSavings,
                ReplacementSuggestion = replacement,
                Reason = $"Sell {holding.Symbol} at a ${Math.Abs(holding.GainLoss):N0} loss, " +
                        $"then buy {replacement} to maintain market exposure while avoiding wash sale rules."
            });
        }

        return opportunities.OrderByDescending(o => o.TaxSavings).ToList();
    }

    /// <summary>
    /// Suggest a replacement security to avoid wash sale
    /// </summary>
    private string SuggestReplacementSecurity(string symbol)
    {
        // Map common holdings to similar ETFs
        // In production, use a more sophisticated mapping or API
        return symbol.ToUpper() switch
        {
            "AAPL" or "MSFT" or "GOOGL" or "AMZN" or "META" => "VGT", // Tech stocks → Vanguard Technology ETF
            "TSLA" => "DRIV", // Tesla → Autonomous Driving ETF
            "JPM" or "BAC" or "WFC" => "VFH", // Banks → Vanguard Financials ETF
            "JNJ" or "PFE" or "UNH" => "VHT", // Healthcare → Vanguard Healthcare ETF
            "XOM" or "CVX" => "VDE", // Energy → Vanguard Energy ETF
            "SPY" => "VOO", // S&P 500 → Vanguard S&P 500
            "QQQ" => "VGT", // Nasdaq → Vanguard Technology
            _ => "VTI" // Default to Total Stock Market ETF
        };
    }

    /// <summary>
    /// Calculate estimated tax liability if all positions sold today
    /// </summary>
    private EstimatedTaxLiability CalculateEstimatedTaxLiability(decimal shortTermGains, decimal longTermGains)
    {
        // Only tax gains, not losses
        var taxableShortTermGains = Math.Max(0, shortTermGains);
        var taxableLongTermGains = Math.Max(0, longTermGains);

        var shortTermTax = taxableShortTermGains * SHORT_TERM_TAX_RATE;
        var longTermTax = taxableLongTermGains * LONG_TERM_TAX_RATE;
        var totalTax = shortTermTax + longTermTax;

        // Calculate effective tax rate
        var totalGains = taxableShortTermGains + taxableLongTermGains;
        var effectiveRate = totalGains != 0 ? (totalTax / totalGains) : 0;

        return new EstimatedTaxLiability
        {
            ShortTermTax = shortTermTax,
            LongTermTax = longTermTax,
            TotalFederalTax = totalTax,
            TaxRate = effectiveRate * 100
        };
    }
}
