namespace PFMP_API.Models.Analytics;

/// <summary>
/// Portfolio performance metrics including TWR, MWR, and risk-adjusted returns
/// </summary>
public class PerformanceMetrics
{
    /// <summary>
    /// Total return in dollars and percentage
    /// </summary>
    public ReturnValue TotalReturn { get; set; } = new();

    /// <summary>
    /// Time-weighted return (removes impact of cash flows)
    /// </summary>
    public decimal TimeWeightedReturn { get; set; }

    /// <summary>
    /// Money-weighted return / Internal Rate of Return
    /// </summary>
    public decimal MoneyWeightedReturn { get; set; }

    /// <summary>
    /// Risk-adjusted return metric (Return - RiskFreeRate) / Volatility
    /// </summary>
    public decimal SharpeRatio { get; set; }

    /// <summary>
    /// Annualized portfolio volatility (standard deviation)
    /// </summary>
    public decimal Volatility { get; set; }

    /// <summary>
    /// Beta vs S&P 500 (sensitivity to market movements)
    /// </summary>
    public decimal Beta { get; set; }

    /// <summary>
    /// Benchmark comparisons
    /// </summary>
    public List<BenchmarkComparison> Benchmarks { get; set; } = new();

    /// <summary>
    /// Historical performance data for charting
    /// </summary>
    public List<PerformanceDataPoint> HistoricalPerformance { get; set; } = new();
}

/// <summary>
/// Return value in both dollars and percentage
/// </summary>
public class ReturnValue
{
    public decimal Dollar { get; set; }
    public decimal Percent { get; set; }
}

/// <summary>
/// Benchmark comparison data
/// </summary>
public class BenchmarkComparison
{
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal Return { get; set; }
    public decimal Volatility { get; set; }
    public decimal SharpeRatio { get; set; }
}

/// <summary>
/// Historical performance data point
/// </summary>
public class PerformanceDataPoint
{
    public DateTime Date { get; set; }
    public decimal PortfolioValue { get; set; }
    public decimal BenchmarkValue { get; set; }
}
