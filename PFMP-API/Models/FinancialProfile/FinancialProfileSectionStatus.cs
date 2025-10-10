using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    /// <summary>
    /// Tracks completion state for each financial profile section so the dashboard can gate access until finished.
    /// </summary>
    [Table("FinancialProfileSectionStatuses")]
    public class FinancialProfileSectionStatus
    {
        [Key]
        public Guid SectionStatusId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// Canonical section key (e.g., "household", "risk-goals", "tsp", "cash", "investments", "real-estate", "insurance", "income").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string SectionKey { get; set; } = string.Empty;

        /// <summary>
        /// Current status for the section wizard.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = FinancialProfileSectionStatuses.NeedsInfo;

        [MaxLength(255)]
        public string? OptOutReason { get; set; }

        public DateTime? OptOutAcknowledgedAt { get; set; }

        [MaxLength(80)]
        public string? DataChecksum { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class FinancialProfileSectionStatuses
    {
        public const string Completed = "completed";
        public const string OptedOut = "opted_out";
        public const string NeedsInfo = "needs_info";
    }
}
