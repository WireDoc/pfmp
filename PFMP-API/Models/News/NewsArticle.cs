using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.News
{
    /// <summary>
    /// Wave 23 — A single news article pulled from an RSS feed (or a future structured news API).
    /// Articles are stored globally (no UserId) so that one fetch serves every user. The
    /// per-user filtering / relevance happens in NewsDigest generation, not here.
    /// </summary>
    [Table("NewsArticles")]
    public class NewsArticle
    {
        [Key]
        public int NewsArticleId { get; set; }

        /// <summary>
        /// RSS feed source name (e.g. "Reuters", "FederalReserve", "Yahoo:VTI").
        /// Display-friendly; doesn't have to match the feed URL.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Source { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Canonical article URL. Unique index — used for cross-run dedup so the ingestion
        /// job doesn't re-process the same article on every poll.
        /// </summary>
        [Required]
        [MaxLength(1000)]
        public string Url { get; set; } = string.Empty;

        /// <summary>
        /// RSS description / first-paragraph summary if the feed provides one.
        /// Capped at 4000 chars so we never blow up a row with full article bodies.
        /// </summary>
        [MaxLength(4000)]
        public string? Summary { get; set; }

        /// <summary>
        /// Article's own publication timestamp parsed from the feed. UTC.
        /// </summary>
        public DateTime PublishedAt { get; set; }

        /// <summary>
        /// When the PFMP ingestion job fetched this article. UTC.
        /// </summary>
        public DateTime FetchedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Routing category assigned by NewsCategorizer. One of:
        /// macro | federal | holdings | weather | regulatory | crypto | other
        /// </summary>
        [MaxLength(40)]
        public string? Category { get; set; }

        /// <summary>
        /// Comma-separated tags / matched keywords / ticker symbols. Used for per-user
        /// relevance filtering at digest time (e.g. an article tagged "VTI" is relevant
        /// to a user holding VTI). Capped at 500 chars.
        /// </summary>
        [MaxLength(500)]
        public string? Tags { get; set; }
    }
}
