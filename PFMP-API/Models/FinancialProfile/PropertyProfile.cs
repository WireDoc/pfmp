using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("Properties")]
    public class PropertyProfile
    {
        [Key]
        public Guid PropertyId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string PropertyName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string PropertyType { get; set; } = "primary";

        [MaxLength(60)]
        public string Occupancy { get; set; } = "owner";

        [Column(TypeName = "decimal(18,2)")]
        public decimal EstimatedValue { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MortgageBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyMortgagePayment { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyRentalIncome { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyExpenses { get; set; }

        public bool HasHeloc { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
