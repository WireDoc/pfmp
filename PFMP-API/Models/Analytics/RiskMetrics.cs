namespace PFMP_API.Models.Analytics;

/// <summary>
/// Portfolio risk metrics including volatility, beta, and correlation
/// </summary>
public class RiskMetrics
{
    /// <summary>
    /// Annualized portfolio volatility (standard deviation)
    /// </summary>
    public decimal Volatility { get; set; }

    /// <summary>
    /// Beta vs S&P 500 (market sensitivity)
    /// </summary>
    public decimal Beta { get; set; }

    /// <summary>
    /// Maximum drawdown (largest peak-to-trough decline)
    /// </summary>
    public decimal MaxDrawdown { get; set; }

    /// <summary>
    /// Date of the peak before max drawdown
    /// </summary>
    public DateTime? MaxDrawdownPeakDate { get; set; }

    /// <summary>
    /// Date of the trough (lowest point)
    /// </summary>
    public DateTime? MaxDrawdownTroughDate { get; set; }

    /// <summary>
    /// Correlation matrix between holdings and benchmarks
    /// </summary>
    public List<CorrelationPair> CorrelationMatrix { get; set; } = new();

    /// <summary>
    /// Historical volatility over time (30-day rolling)
    /// </summary>
    public List<VolatilityDataPoint> VolatilityHistory { get; set; } = new();

    /// <summary>
    /// Historical drawdown data (underwater chart)
    /// </summary>
    public List<DrawdownDataPoint> DrawdownHistory { get; set; } = new();
}

/// <summary>
/// Correlation between two securities
/// </summary>
public class CorrelationPair
{
    public string Symbol1 { get; set; } = string.Empty;
    public string Symbol2 { get; set; } = string.Empty;
    public decimal Correlation { get; set; }
}

/// <summary>
/// Historical volatility data point
/// </summary>
public class VolatilityDataPoint
{
    public DateTime Date { get; set; }
    public decimal Volatility { get; set; }
}

/// <summary>
/// Historical drawdown data point
/// </summary>
public class DrawdownDataPoint
{
    public DateTime Date { get; set; }
    public decimal Drawdown { get; set; }
}
