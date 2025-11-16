namespace PFMP_API.Models.Analytics;

/// <summary>
/// Asset allocation breakdown by various dimensions
/// </summary>
public class AllocationBreakdown
{
    /// <summary>
    /// Dimension of allocation (assetClass, sector, geography, marketCap)
    /// </summary>
    public string Dimension { get; set; } = string.Empty;

    /// <summary>
    /// Individual allocations
    /// </summary>
    public List<AllocationItem> Allocations { get; set; } = new();

    /// <summary>
    /// Rebalancing recommendations
    /// </summary>
    public List<RebalancingRecommendation> RebalancingRecommendations { get; set; } = new();
}

/// <summary>
/// Single allocation item
/// </summary>
public class AllocationItem
{
    public string Category { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal Percent { get; set; }
    public decimal? TargetPercent { get; set; }
    public decimal? Drift { get; set; }
}

/// <summary>
/// Rebalancing recommendation
/// </summary>
public class RebalancingRecommendation
{
    public string Action { get; set; } = string.Empty; // "buy" or "sell"
    public string Holding { get; set; } = string.Empty;
    public decimal? Shares { get; set; }
    public decimal? DollarAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
}
