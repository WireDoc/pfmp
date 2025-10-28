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

        // ===== Wave 7: Dual AI Integration Fields =====

        /// <summary>
        /// Conservative AI recommendation (Claude typically)
        /// </summary>
        [MaxLength(5000)]
        public string? ConservativeRecommendation { get; set; }

        /// <summary>
        /// Aggressive AI recommendation (Gemini typically)
        /// </summary>
        [MaxLength(5000)]
        public string? AggressiveRecommendation { get; set; }

        /// <summary>
        /// Agreement score between dual AIs (0-1)
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? AgreementScore { get; set; }

        /// <summary>
        /// Did both AIs agree on this recommendation?
        /// </summary>
        public bool? HasConsensus { get; set; }

        /// <summary>
        /// Total cost to generate this advice (USD)
        /// </summary>
        [Column(TypeName = "decimal(10,6)")]
        public decimal? AIGenerationCost { get; set; }

        /// <summary>
        /// Total tokens used across both AI models
        /// </summary>
        public int? TotalTokensUsed { get; set; }

        /// <summary>
        /// Market context ID used when generating this advice
        /// </summary>
        public int? MarketContextId { get; set; }

        [ForeignKey(nameof(MarketContextId))]
        public MarketContext? MarketContext { get; set; }

        /// <summary>
        /// Which AI models were used (JSON array): ["claude-3-5-sonnet", "gemini-1.5-pro"]
        /// </summary>
        [MaxLength(200)]
        public string? ModelsUsed { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual User? User { get; set; }
    }
}
