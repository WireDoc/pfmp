using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Individual message in an AI conversation
    /// </summary>
    public class AIMessage
    {
        [Key]
        public int MessageId { get; set; }

        [Required]
        public int ConversationId { get; set; }

        [ForeignKey(nameof(ConversationId))]
        public AIConversation? Conversation { get; set; }

        /// <summary>
        /// Message role: user, assistant, system
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "user";

        /// <summary>
        /// Message content. No length cap (text column) — Wave 24 assistant responses
        /// with the full Chat-slot prompt + reasoning summary can exceed 5000 chars.
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// When the message was sent
        /// </summary>
        [Required]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Which AI model generated this response (null for user messages)
        /// </summary>
        [MaxLength(50)]
        public string? ModelUsed { get; set; }

        /// <summary>
        /// Tokens used for this message (null for user messages)
        /// </summary>
        public int? TokensUsed { get; set; }

        /// <summary>
        /// Cost for this message in USD (null for user messages)
        /// </summary>
        [Column(TypeName = "decimal(10,6)")]
        public decimal? MessageCost { get; set; }

        /// <summary>
        /// Consensus result for this message if dual AI was used
        /// </summary>
        public bool UsedConsensus { get; set; }

        /// <summary>
        /// Agreement score if consensus was used (0-1)
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? AgreementScore { get; set; }

        /// <summary>
        /// Wave 24 — Input token count for this message (assistant rows only).
        /// Combined with OutputTokens this lets cost analysis split prompt-vs-completion
        /// without re-parsing the OpenRouter response.
        /// </summary>
        public int? InputTokens { get; set; }

        /// <summary>
        /// Wave 24 — Output token count for this message (assistant rows only).
        /// </summary>
        public int? OutputTokens { get; set; }

        /// <summary>
        /// Wave 24 — How many of the input tokens hit the prompt cache. Pulled from
        /// OpenRouter's usage.prompt_tokens_details.cached_tokens. Drives the
        /// "cache savings" indicator in the sidebar.
        /// </summary>
        public int? CachedTokens { get; set; }

        /// <summary>
        /// Wave 24 — Reasoning effort actually used for this assistant turn. Surfaces
        /// whether the user enabled "Deep think" for that message so we can audit
        /// cost spikes against the toggle history. Null for non-reasoning models or
        /// when the slot config did not request reasoning.
        /// </summary>
        public AIReasoningEffort? ReasoningEffort { get; set; }
    }
}
