using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models;

/// <summary>
/// Wave 16 §8.1 — Pre-computed per-symbol metrics (52w high/low, YTD %).
/// One row per symbol; refreshed daily by <c>SymbolMetricsRefreshJob</c> using the
/// existing <c>PriceHistory</c> cache as the data source. Lets
/// <c>BuildFullFinancialContextAsync</c> render 52w/YTD lines per holding via a
/// single dictionary lookup instead of fetching FMP or scanning a year of OHLCV
/// rows on every AI prompt.
/// </summary>
[Table("SymbolMetricsCache")]
public class SymbolMetricsCache
{
    [Key]
    [StringLength(20)]
    public string Symbol { get; set; } = string.Empty;

    /// <summary>Date of the most recent price row used for this snapshot.</summary>
    public DateOnly AsOfDate { get; set; }

    [Column(TypeName = "decimal(18,8)")]
    public decimal Last { get; set; }

    [Column(TypeName = "decimal(18,8)")]
    public decimal High52w { get; set; }

    [Column(TypeName = "decimal(18,8)")]
    public decimal Low52w { get; set; }

    /// <summary>Closing price on the first trading day of the current calendar year.</summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal? YearStartClose { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal? YtdPercent { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal PercentFrom52wHigh { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal PercentFrom52wLow { get; set; }

    public DateTime RefreshedAt { get; set; } = DateTime.UtcNow;
}
