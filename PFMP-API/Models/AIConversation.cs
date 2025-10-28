using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Represents a chat conversation session between user and AI advisor
    /// </summary>
    public class AIConversation
    {
        [Key]
        public int ConversationId { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        /// <summary>
        /// When the conversation started
        /// </summary>
        [Required]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the conversation ended (null if still active)
        /// </summary>
        public DateTime? EndedAt { get; set; }

        /// <summary>
        /// Type of conversation: Chat, Analysis, Support
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string ConversationType { get; set; } = "Chat";

        /// <summary>
        /// AI-generated summary of the conversation (created when conversation ends)
        /// </summary>
        [MaxLength(1000)]
        public string? ConversationSummary { get; set; }

        /// <summary>
        /// Total tokens used across all messages
        /// </summary>
        public int TotalTokensUsed { get; set; }

        /// <summary>
        /// Total cost for this conversation (USD)
        /// </summary>
        [Column(TypeName = "decimal(10,6)")]
        public decimal TotalCost { get; set; }

        /// <summary>
        /// Number of message exchanges
        /// </summary>
        public int MessageCount { get; set; }

        /// <summary>
        /// Was any advice generated from this conversation?
        /// </summary>
        public bool GeneratedAdvice { get; set; }

        /// <summary>
        /// Related advice ID if advice was generated
        /// </summary>
        public int? RelatedAdviceId { get; set; }

        [ForeignKey(nameof(RelatedAdviceId))]
        public Advice? RelatedAdvice { get; set; }

        /// <summary>
        /// Individual messages in this conversation
        /// </summary>
        public ICollection<AIMessage> Messages { get; set; } = new List<AIMessage>();
    }
}
