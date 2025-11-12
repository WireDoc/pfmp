using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models;

/// <summary>
/// Historical price data for holdings
/// Used for charting and performance analysis
/// </summary>
[Table("PriceHistory")]
public class PriceHistory
{
    [Key]
    public int PriceHistoryId { get; set; }
    
    /// <summary>
    /// Foreign key to Holding (optional, null for symbol-only tracking)
    /// </summary>
    public int? HoldingId { get; set; }
    
    [ForeignKey("HoldingId")]
    public Holding? Holding { get; set; }
    
    /// <summary>
    /// Stock symbol (required for querying)
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Symbol { get; set; } = string.Empty;
    
    /// <summary>
    /// Price date (UTC)
    /// </summary>
    [Required]
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Opening price
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal Open { get; set; }
    
    /// <summary>
    /// Highest price during the day
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal High { get; set; }
    
    /// <summary>
    /// Lowest price during the day
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal Low { get; set; }
    
    /// <summary>
    /// Closing price
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal Close { get; set; }
    
    /// <summary>
    /// Trading volume
    /// </summary>
    public long Volume { get; set; }
    
    /// <summary>
    /// Adjusted close price (for dividends/splits)
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal? AdjustedClose { get; set; }
    
    /// <summary>
    /// Price change from previous close
    /// </summary>
    [Column(TypeName = "decimal(18,8)")]
    public decimal? Change { get; set; }
    
    /// <summary>
    /// Percentage change from previous close
    /// </summary>
    [Column(TypeName = "decimal(10,4)")]
    public decimal? ChangePercent { get; set; }
    
    /// <summary>
    /// When this record was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
