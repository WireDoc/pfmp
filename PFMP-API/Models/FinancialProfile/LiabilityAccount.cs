using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileLiabilities")]
    public class LiabilityAccount
    {
        [Key]
        public int LiabilityAccountId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(80)]
        public string LiabilityType { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Lender { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentBalance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? InterestRateApr { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MinimumPayment { get; set; }

        public DateTime? PayoffTargetDate { get; set; }

        public bool IsPriorityToEliminate { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
