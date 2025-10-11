using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileBenefitCoverages")]
    public class BenefitCoverage
    {
        [Key]
        public int BenefitCoverageId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(120)]
        public string BenefitType { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? Provider { get; set; }

        public bool IsEnrolled { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? EmployerContributionPercent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyCost { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
