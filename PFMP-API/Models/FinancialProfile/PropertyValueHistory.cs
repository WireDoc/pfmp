using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    /// <summary>
    /// Tracks property value changes over time for equity growth charts.
    /// </summary>
    [Table("PropertyValueHistory")]
    public class PropertyValueHistory
    {
        [Key]
        public int PropertyValueHistoryId { get; set; }

        [Required]
        public Guid PropertyId { get; set; }

        /// <summary>
        /// Date this value was recorded (typically month-end snapshots).
        /// </summary>
        [Required]
        public DateTime ValueDate { get; set; }

        /// <summary>
        /// Estimated property value at this date.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal EstimatedValue { get; set; }

        /// <summary>
        /// Mortgage balance at this date (for equity calculation).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MortgageBalance { get; set; }

        /// <summary>
        /// Calculated equity: EstimatedValue - MortgageBalance.
        /// </summary>
        [NotMapped]
        public decimal Equity => EstimatedValue - (MortgageBalance ?? 0);

        /// <summary>
        /// Source of the value: "manual", "plaid", "zillow", etc.
        /// </summary>
        [MaxLength(50)]
        public string? ValueSource { get; set; } = "manual";

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [ForeignKey("PropertyId")]
        public PropertyProfile? Property { get; set; }
    }
}
