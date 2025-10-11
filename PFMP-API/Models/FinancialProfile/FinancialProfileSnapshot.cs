using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    /// <summary>
    /// Aggregate view of a user's financial profile completion and key financial metrics.
    /// </summary>
    [Table("FinancialProfileSnapshots")]
    public class FinancialProfileSnapshot
    {
        [Key]
        public int UserId { get; set; }

        [Range(0, 100)]
        public decimal CompletionPercent { get; set; }

        public int CompletedSectionCount { get; set; }

        public int OptedOutSectionCount { get; set; }

        public int OutstandingSectionCount { get; set; }

        public DateTime? ProfileCompletedAt { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetWorthEstimate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyCashFlowEstimate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalLiabilityBalance { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyDebtServiceEstimate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyExpenseEstimate { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal? MarginalTaxRatePercent { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal? EffectiveTaxRatePercent { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal? FederalWithholdingPercent { get; set; }

    public bool UsesCpaOrPreparer { get; set; }

    public int LongTermObligationCount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal LongTermObligationEstimate { get; set; }

    public DateTime? NextObligationDueDate { get; set; }

        /// <summary>
        /// JSON (text) column storing arrays of section keys for quick dashboard display.
        /// </summary>
        public string? CompletedSectionsJson { get; set; }
        public string? OptedOutSectionsJson { get; set; }
        public string? OutstandingSectionsJson { get; set; }

        [Required]
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    }
}
