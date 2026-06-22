using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.AI
{
    /// <summary>
    /// Wave 24 — Daily snapshot of a user's full financial profile used as the
    /// cacheable prefix for chat-slot prompts. Stored verbatim so subsequent chat
    /// messages within the same day reuse identical bytes; OpenRouter / provider
    /// prompt caching then keeps the prefix warm and we pay ~10% of normal input
    /// cost on cache hits.
    ///
    /// Invalidation:
    ///   - One row per (UserId, SnapshotDate) — natural cache key.
    ///   - When user data changes mid-day we set ContentHash to a new value AND
    ///     update Content. Same SnapshotDate, new bytes — the provider cache then
    ///     refills on the next request. The hash lets the snapshot service detect
    ///     "is the rebuilt content actually different?" so we don't churn the cache
    ///     for no-op recomputes.
    ///
    /// Live (non-cacheable) data — current ticker prices, today's news digest —
    /// is appended outside this block per request, so price freshness is not
    /// gated by snapshot age.
    /// </summary>
    [Table("UserContextSnapshots")]
    public class UserContextSnapshot
    {
        [Key]
        public int UserContextSnapshotId { get; set; }

        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// The calendar date this snapshot represents (UTC). The (UserId, SnapshotDate)
        /// pair is unique — at most one snapshot per user per day.
        /// </summary>
        [Column(TypeName = "date")]
        public DateTime SnapshotDate { get; set; }

        /// <summary>
        /// SHA-256 hex digest of <see cref="Content"/>. Lets the rebuild path skip
        /// the DB write when the assembled content is byte-identical to the
        /// existing snapshot — keeps the provider cache hot.
        /// </summary>
        [Required]
        [MaxLength(64)]
        public string ContentHash { get; set; } = string.Empty;

        /// <summary>
        /// The assembled cacheable context block. Sent verbatim as the prefix of
        /// every chat message for this user on this day. No length cap — typical
        /// content is 8-15k tokens (~40k chars).
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Estimated token count for <see cref="Content"/> (chars/4 rule of thumb).
        /// Used for cost projection in the UI before the user sends a message.
        /// </summary>
        public int EstimatedTokens { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
