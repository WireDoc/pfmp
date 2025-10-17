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
        public string FundCode { get; set; } = string.Empty; // e.g., L2030 ... L2075

        [Column(TypeName = "decimal(8,4)")]
        public decimal AllocationPercent { get; set; }

        [Column(TypeName = "decimal(18,6)")]
        public decimal Units { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
