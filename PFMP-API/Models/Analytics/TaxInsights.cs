namespace PFMP_API.Models.Analytics;

/// <summary>
/// Tax insights including unrealized gains/losses and harvesting opportunities
/// </summary>
public class TaxInsights
{
    /// <summary>
    /// Summary of unrealized gains/losses
    /// </summary>
    public UnrealizedGainsSummary UnrealizedGains { get; set; } = new();

    /// <summary>
    /// Individual holdings with tax details
    /// </summary>
    public List<HoldingTaxDetail> Holdings { get; set; } = new();

    /// <summary>
    /// Tax-loss harvesting opportunities
    /// </summary>
    public List<HarvestingOpportunity> HarvestingOpportunities { get; set; } = new();

    /// <summary>
    /// Estimated tax liability if all positions sold today
    /// </summary>
    public EstimatedTaxLiability EstimatedTaxLiability { get; set; } = new();
}

/// <summary>
/// Summary of unrealized gains/losses
/// </summary>
public class UnrealizedGainsSummary
{
    public ReturnValue ShortTerm { get; set; } = new();
    public ReturnValue LongTerm { get; set; } = new();
    public ReturnValue Total { get; set; } = new();
}

/// <summary>
/// Tax details for a single holding
/// </summary>
public class HoldingTaxDetail
{
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal CostBasis { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal GainLoss { get; set; }
    public decimal PercentGain { get; set; }
    public string HoldingPeriod { get; set; } = string.Empty;
    public string TaxType { get; set; } = string.Empty; // "shortTerm" or "longTerm"
    public DateTime PurchaseDate { get; set; }
}

/// <summary>
/// Tax-loss harvesting opportunity
/// </summary>
public class HarvestingOpportunity
{
    public string Symbol { get; set; } = string.Empty;
    public decimal Loss { get; set; }
    public string HoldingPeriod { get; set; } = string.Empty;
    public decimal TaxSavings { get; set; }
    public string? ReplacementSuggestion { get; set; }
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Estimated tax liability
/// </summary>
public class EstimatedTaxLiability
{
    public decimal ShortTermTax { get; set; }
    public decimal LongTermTax { get; set; }
    public decimal TotalFederalTax { get; set; }
    public decimal TaxRate { get; set; }
}
