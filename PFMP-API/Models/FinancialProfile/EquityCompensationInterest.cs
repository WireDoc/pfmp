using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileEquityInterest")]
    public class EquityCompensationInterest
    {
        [Key]
        public int UserId { get; set; }

        public bool IsInterestedInTracking { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
