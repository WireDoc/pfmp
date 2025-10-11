using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileTaxProfiles")]
    public class TaxProfile
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [MaxLength(40)]
        public string FilingStatus { get; set; } = "single";

        [MaxLength(80)]
        public string? StateOfResidence { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? MarginalRatePercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? EffectiveRatePercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? FederalWithholdingPercent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ExpectedRefundAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ExpectedPaymentAmount { get; set; }

        public bool UsesCpaOrPreparer { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
