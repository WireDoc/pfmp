using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Canonical advice object representing a generated financial recommendation set or narrative.
    /// Wave 1: Minimal fields (no validator / violations yet).
    /// Future waves will extend with validator JSON, rule violations, task linkage.
    /// </summary>
    public class Advice
    {
        [Key]
        public int AdviceId { get; set; }

        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// Thematic category (e.g., General, Retirement, CashFlow). Optional in Wave 1.
        /// </summary>
        [MaxLength(100)]
        public string? Theme { get; set; }

        /// <summary>
        /// Current lifecycle status of the advice.
        /// Proposed | Accepted | Rejected | ConvertedToTask
        /// </summary>
        [Required]
        [MaxLength(40)]
        public string Status { get; set; } = "Proposed";

        /// <summary>
        /// Final consensus or single-pass narrative text returned to UI.
        /// </summary>
        [Required]
        public string ConsensusText { get; set; } = string.Empty;

        /// <summary>
        /// Placeholder confidence score (0-100). Later waves will compute heuristically.
        /// </summary>
        public int ConfidenceScore { get; set; } = 60;

        /// <summary>
        /// Raw primary model JSON (reserved; may be null in Wave 1 if not structured).
        /// </summary>
        public string? PrimaryJson { get; set; }

        /// <summary>
        /// Reserved for validator output (Wave 2+).
        /// </summary>
        public string? ValidatorJson { get; set; }

        /// <summary>
        /// Rule / policy violations (Wave 2+), stored as JSON array.
        /// </summary>
        public string? ViolationsJson { get; set; }

        /// <summary>
        /// Optional linkage to a task created from this advice (Wave 4+ use case).
        /// </summary>
        public int? LinkedTaskId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual User? User { get; set; }
    }
}
