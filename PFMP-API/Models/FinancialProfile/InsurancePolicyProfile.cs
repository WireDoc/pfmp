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

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
