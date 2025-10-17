using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("TspPositionSnapshots")]
    public class TspPositionSnapshot
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(10)]
        public string FundCode { get; set; } = string.Empty; // G,F,C,S,I or L2030...L2075

        [Column(TypeName = "decimal(18,6)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(18,6)")]
        public decimal Units { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MarketValue { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal MixPercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? AllocationPercent { get; set; }

        public DateTime AsOfUtc { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
