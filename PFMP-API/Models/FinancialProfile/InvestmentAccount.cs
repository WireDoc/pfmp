using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("InvestmentAccounts")]
    public class InvestmentAccount
    {
        [Key]
        public Guid InvestmentAccountId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string AccountName { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Institution { get; set; }

        [MaxLength(60)]
        public string AccountCategory { get; set; } = "brokerage";

        [MaxLength(60)]
        public string? AssetClass { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentValue { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CostBasis { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? ContributionRatePercent { get; set; }

        public bool IsTaxAdvantaged { get; set; }

        public DateTime? LastContributionDate { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
