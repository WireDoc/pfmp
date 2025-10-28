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
        /// Message content
        /// </summary>
        [Required]
        [MaxLength(5000)]
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
    }
}
