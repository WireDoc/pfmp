using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Spending;

/// <summary>
/// Wave 14: pre-computed monthly roll-up cache. <c>SpendingRollupJob</c> refreshes
/// these after every Plaid sync; the spending dashboard and AI context read them
/// without on-the-fly aggregation in the request path. Internal-transfer
/// categories are excluded at aggregation time.
/// </summary>
[Table("SpendingCategoryRollups")]
public class SpendingCategoryRollup
{
    [Key]
    public int RollupId { get; set; }

    [Required]
    public int UserId { get; set; }

    /// <summary>First day of the calendar month, UTC.</summary>
    [Required]
    public DateTime PeriodStart { get; set; }

    [Required]
    [MaxLength(120)]
    public string PlaidPrimaryCategory { get; set; } = string.Empty;

    [MaxLength(160)]
    public string? PlaidDetailedCategory { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal ActualAmount { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal? BudgetedAmount { get; set; }

    public int TransactionCount { get; set; }

    [Required]
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
