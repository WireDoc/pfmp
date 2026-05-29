using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Spending;

/// <summary>
/// Wave 14 P3: per-category IQR-flagged transaction. Persisted so the dashboard
/// can show history without recomputing the IQR. Tied 1:1 to a CashTransaction.
/// </summary>
[Table("SpendingAnomalies")]
public class SpendingAnomaly
{
    [Key]
    public int AnomalyId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int CashTransactionId { get; set; }

    [Required]
    [MaxLength(120)]
    public string PlaidPrimaryCategory { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,4)")]
    public decimal Amount { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal CategoryMedian { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal CategoryIqr { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal DeviationMultiple { get; set; }

    [Required]
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    public bool Dismissed { get; set; } = false;
}
