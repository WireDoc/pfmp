using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileInsurancePolicies")]
    public class FinancialProfileInsurancePolicy
    {
        [Key]
    public Guid InsurancePolicyId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(120)]
        public string PolicyType { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? Carrier { get; set; }

        [MaxLength(200)]
        public string? PolicyName { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CoverageAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PremiumAmount { get; set; }

        [MaxLength(30)]
        public string? PremiumFrequency { get; set; }

        public DateTime? RenewalDate { get; set; }

        public bool IsAdequateCoverage { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RecommendedCoverage { get; set; }

        /// <summary>
        /// Wave 14 P2 follow-on: true when the premium is auto-deducted from the
        /// user's paycheck (FEHB / FEDVIP / FEGLI for federal employees;
        /// employer-sponsored pre-tax health for civilians). Paycheck-deducted
        /// premiums are EXCLUDED from <c>CashFlowSummary.TotalMonthlyOutflows</c>
        /// because the salary's <c>MonthlyNetAmount</c> already excludes them —
        /// including them would double-count. They still appear in the AI prompt
        /// (annotated <c>[paycheck-deducted]</c>) and as an informational section
        /// on the dashboard so the AI can suggest cheaper plans / coverage
        /// changes without believing the user is paying twice.
        /// </summary>
        public bool IsPaycheckDeducted { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
