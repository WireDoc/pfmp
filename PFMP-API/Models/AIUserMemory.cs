using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Long-term AI memory about user preferences and patterns
    /// Learns from user behavior over time
    /// </summary>
    public class AIUserMemory
    {
        [Key]
        public int UserMemoryId { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        /// <summary>
        /// Type of memory: Preference, Pattern, Goal, Risk, Communication
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string MemoryType { get; set; } = string.Empty;

        /// <summary>
        /// Memory key: "risk_comfort", "prefers_conservative", "dislikes_crypto", "communication_style"
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string MemoryKey { get; set; } = string.Empty;

        /// <summary>
        /// Memory value: "Uncomfortable with crypto", "Prefers detailed explanations"
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string MemoryValue { get; set; } = string.Empty;

        /// <summary>
        /// Context about when/how this was learned
        /// </summary>
        [MaxLength(500)]
        public string? Context { get; set; }

        /// <summary>
        /// Confidence in this memory (0-100), strengthens with repeated signals
        /// </summary>
        [Required]
        public int ConfidenceScore { get; set; } = 50;

        /// <summary>
        /// When this preference was first learned
        /// </summary>
        [Required]
        public DateTime LearnedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When this preference was last reinforced
        /// </summary>
        [Required]
        public DateTime LastReinforcedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Number of times this preference has been reinforced
        /// </summary>
        [Required]
        public int ReinforcementCount { get; set; } = 1;

        /// <summary>
        /// Is this memory currently active?
        /// </summary>
        [Required]
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// When this memory was deprecated/invalidated (if applicable)
        /// </summary>
        public DateTime? DeprecatedAt { get; set; }

        /// <summary>
        /// Reason for deprecation
        /// </summary>
        [MaxLength(200)]
        public string? DeprecationReason { get; set; }

        /// <summary>
        /// Related conversation that led to this memory
        /// </summary>
        public int? SourceConversationId { get; set; }

        [ForeignKey(nameof(SourceConversationId))]
        public AIConversation? SourceConversation { get; set; }

        /// <summary>
        /// Related advice that revealed this preference
        /// </summary>
        public int? SourceAdviceId { get; set; }

        [ForeignKey(nameof(SourceAdviceId))]
        public Advice? SourceAdvice { get; set; }
    }
}
