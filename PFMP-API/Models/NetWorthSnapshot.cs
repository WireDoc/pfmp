using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Historical snapshot of a user's net worth for the timeline feature (Wave 10)
    /// </summary>
    [Table("NetWorthSnapshots")]
    public class NetWorthSnapshot
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [Column(TypeName = "date")]
        public DateOnly SnapshotDate { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalNetWorth { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal InvestmentsTotal { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal CashTotal { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RealEstateEquity { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RetirementTotal { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal LiabilitiesTotal { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
