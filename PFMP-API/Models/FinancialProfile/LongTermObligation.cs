using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileLongTermObligations")]
    public class LongTermObligation
    {
        [Key]
        public int LongTermObligationId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(150)]
        public string ObligationName { get; set; } = string.Empty;

        [MaxLength(80)]
        public string ObligationType { get; set; } = "general";

        public DateTime? TargetDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? EstimatedCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FundsAllocated { get; set; }

        [MaxLength(60)]
        public string? FundingStatus { get; set; }

        public bool IsCritical { get; set; }

        [MaxLength(400)]
        public string? Notes { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
