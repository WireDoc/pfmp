using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("IncomeStreams")]
    public class IncomeStreamProfile
    {
        [Key]
        public Guid IncomeStreamId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string IncomeType { get; set; } = "salary";

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AnnualAmount { get; set; }

        public bool IsGuaranteed { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
