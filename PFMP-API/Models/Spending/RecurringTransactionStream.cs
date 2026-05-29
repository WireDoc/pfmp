using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Spending;

/// <summary>
/// Wave 14: a recurring inflow or outflow stream. Plaid Recurring Transactions
/// endpoint (P3) is the primary source; heuristic detection fills gaps for
/// non-Plaid accounts. Plaid wins on conflict.
/// </summary>
[Table("RecurringTransactionStreams")]
public class RecurringTransactionStream
{
    [Key]
    public int StreamId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public RecurringStreamSource Source { get; set; }

    /// <summary>Plaid's stream id when Source = PlaidRecurring; uniqueness key.</summary>
    [MaxLength(100)]
    public string? PlaidStreamId { get; set; }

    [Required]
    [MaxLength(200)]
    public string MerchantName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public RecurringStreamDirection Direction { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal LastAmount { get; set; }

    [Required]
    public RecurringStreamFrequency Frequency { get; set; }

    public DateTime LastDate { get; set; }

    public DateTime? NextExpectedDate { get; set; }

    public bool IsActive { get; set; } = true;

    [Required]
    public RecurringStreamStatus Status { get; set; }

    [Column(TypeName = "decimal(5,4)")]
    public decimal? ConfidenceScore { get; set; }

    [MaxLength(120)]
    public string? PlaidCategory { get; set; }

    [MaxLength(160)]
    public string? PlaidCategoryDetailed { get; set; }

    [Required]
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}

public enum RecurringStreamSource
{
    PlaidRecurring,
    Heuristic,
}

public enum RecurringStreamDirection
{
    Inflow,
    Outflow,
}

public enum RecurringStreamFrequency
{
    Weekly,
    Biweekly,
    SemiMonthly,
    Monthly,
    Annual,
    Unknown,
}

public enum RecurringStreamStatus
{
    Mature,
    EarlyDetection,
    Tombstoned,
}
