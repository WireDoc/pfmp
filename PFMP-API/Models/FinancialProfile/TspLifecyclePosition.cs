using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("TspLifecyclePositions")]
    public class TspLifecyclePosition
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
    [MaxLength(10)]
    public string FundCode { get; set; } = string.Empty; // G,F,C,S,I,L-INCOME or L2030...L2075

    // User-managed contribution target for this fund (0-100). Must sum to 100 across funds.
    [Column(TypeName = "decimal(8,4)")]
    public decimal ContributionPercent { get; set; }

    [Column(TypeName = "decimal(18,6)")]
    public decimal Units { get; set; }

    // Denormalized, refreshed when we recalc prices/snapshots for quick reads (read-only to clients)
    [Column(TypeName = "decimal(18,6)")]
    public decimal? CurrentPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? CurrentMarketValue { get; set; }

    [Column(TypeName = "decimal(8,4)")]
    public decimal? CurrentMixPercent { get; set; }

    public DateTime? LastPricedAsOfUtc { get; set; }

    // Updated whenever Units or ContributionPercent change (manual or automated adjustment)
    public DateTime? DateUpdated { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
