using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Canonical advice object representing a generated financial recommendation or narrative.
    /// Lifecycle (simplified): Proposed -> Accepted (task created) or Dismissed.
    /// Advice never reverts once Accepted; dismissal can be directly overridden by Accept.
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
    /// Allowed: Proposed | Accepted | Dismissed
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
    /// Optional linkage to a task created from this advice (set on Accept if task created).
        /// </summary>
        public int? LinkedTaskId { get; set; }

    /// <summary>
    /// Timestamp when advice was accepted (and task created). Null until acceptance.
    /// </summary>
    public DateTime? AcceptedAt { get; set; }

    /// <summary>
    /// Timestamp when advice was dismissed (Status = Dismissed). Null otherwise.
    /// </summary>
    public DateTime? DismissedAt { get; set; }

    /// <summary>
    /// If dismissed, the prior status (normally Proposed) stored only for potential analytics.
    /// Not used to restore automatically since Accept overrides dismissal directly.
    /// </summary>
    [MaxLength(40)]
    public string? PreviousStatus { get; set; }

    /// <summary>
    /// If this advice was generated from an alert, reference its ID.
    /// </summary>
    public int? SourceAlertId { get; set; }

    /// <summary>
    /// Generation method e.g. Manual | FromAlert | AI.
    /// </summary>
    [MaxLength(40)]
    public string? GenerationMethod { get; set; }

    /// <summary>
    /// Immutable snapshot JSON of source alert at generation time (optional).
    /// </summary>
    public string? SourceAlertSnapshot { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual User? User { get; set; }
    }
}
