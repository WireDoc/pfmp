using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.News
{
    /// <summary>
    /// Wave 23 — A per-user, per-period synthesized digest produced by Gemini Flash
    /// from the relevant subset of NewsArticles for that user. One row per user per
    /// ingestion run. Consumed by:
    ///   1. AIIntelligenceService.BuildMarketContextSummaryAsync (replaces the stale
    ///      MarketContexts block in the AI prompt).
    ///   2. The dashboard NewsDigestWidget + drill-down view.
    /// </summary>
    [Table("NewsDigests")]
    public class NewsDigest
    {
        [Key]
        public int NewsDigestId { get; set; }

        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// When this digest was synthesized. UTC. The latest row per user is the
        /// "current" digest; older rows form a history for the trend chart follow-up.
        /// </summary>
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Earliest article publish time in this digest's input window. Anything
        /// earlier was dropped or already covered by a prior digest.
        /// </summary>
        public DateTime PeriodStart { get; set; }

        /// <summary>
        /// Latest article publish time in this digest's input window — typically
        /// the moment the job ran.
        /// </summary>
        public DateTime PeriodEnd { get; set; }

        /// <summary>
        /// Raw JSON response from Gemini Flash. Kept for audit / debug / future
        /// re-parsing if we add fields without re-running synthesis.
        /// </summary>
        public string? RawJson { get; set; }

        /// <summary>
        /// Per-category narrative summaries. Each is plain text, 2–5 sentences,
        /// suitable for direct insertion into the AI prompt's MARKET CONTEXT block
        /// AND for the dashboard widget categories. Nullable when the category had
        /// no material articles in this period.
        /// </summary>
        public string? MacroSummary { get; set; }
        public string? FederalSummary { get; set; }
        public string? HoldingsSummary { get; set; }
        public string? WeatherSummary { get; set; }
        public string? RegulatorySummary { get; set; }
        public string? CryptoSummary { get; set; }
        public string? GeopoliticalSummary { get; set; }

        /// <summary>
        /// Overall sentiment label, e.g. "bullish", "cautiously_bullish", "neutral",
        /// "cautiously_bearish", "bearish", "mixed". Free-form to give Gemini Flash
        /// room to express nuance; the consumer maps it to a chip color.
        /// </summary>
        [MaxLength(40)]
        public string? OverallSentiment { get; set; }

        /// <summary>
        /// 0.0 – 1.0 confidence the model has in its overall sentiment.
        /// </summary>
        [Column(TypeName = "decimal(4,3)")]
        public decimal? Confidence { get; set; }

        /// <summary>
        /// One-line headline summary capturing the most important thing in the
        /// digest period. Drives the compact widget headline.
        /// </summary>
        [MaxLength(500)]
        public string? Headline { get; set; }

        /// <summary>
        /// 2-3 paragraph narrative briefing written in radio/morning-newscast style,
        /// weaving the most relevant threads from the period into a single readable
        /// summary tailored to this user. Distinct from the per-category bullets —
        /// this is the "what you'd hear on the morning news" view. Stored as text
        /// (no length cap) since 2-3 paragraphs can reach ~1500 chars and we don't
        /// want to truncate mid-sentence.
        /// </summary>
        public string? NarrativeSummary { get; set; }

        /// <summary>
        /// Number of distinct NewsArticles that fed this digest after dedup +
        /// per-user relevance filtering.
        /// </summary>
        public int ArticleCount { get; set; }

        /// <summary>
        /// Token + dollar cost of the synthesis LLM call. Tracks against the user's
        /// overall AI cost budget.
        /// </summary>
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }

        [Column(TypeName = "decimal(10,6)")]
        public decimal LlmCostUsd { get; set; }
    }
}
