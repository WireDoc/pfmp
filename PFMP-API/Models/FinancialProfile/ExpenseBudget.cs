using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileExpenses")]
    public class ExpenseBudget
    {
        [Key]
        public int ExpenseBudgetId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyAmount { get; set; }

        public bool IsEstimated { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }

        // Wave 14 P1 — period / effective dates / rollover / Plaid category linkage
        public BudgetPeriodType PeriodType { get; set; } = BudgetPeriodType.Monthly;

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

        public DateTime? EffectiveTo { get; set; }

        public bool RolloverEnabled { get; set; } = false;

        [Column(TypeName = "decimal(18,4)")]
        public decimal RolloverAmount { get; set; } = 0m;

        [MaxLength(120)]
        public string? PlaidPrimaryCategory { get; set; }

        [MaxLength(160)]
        public string? PlaidDetailedCategory { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum BudgetPeriodType
    {
        Monthly,
        Weekly,
        Biweekly,
        Annual,
    }
}
