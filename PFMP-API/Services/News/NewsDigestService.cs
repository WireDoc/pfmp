using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.News;

namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Hot-path read API for the latest digest + supporting article list.
    /// Two consumers:
    ///   1. AIIntelligenceService.BuildMarketContextSummaryAsync — needs the digest
    ///      as plaintext for direct insertion into the AI prompt.
    ///   2. The dashboard widget + drill-down view — needs structured digest data
    ///      and the matching article list.
    /// Stateless (no in-memory cache); EF queries are indexed (UserId, GeneratedAt
    /// desc) so the latest-digest read is a single-row index seek.
    /// </summary>
    public interface INewsDigestService
    {
        Task<NewsDigest?> GetLatestDigestAsync(int userId, CancellationToken ct = default);

        /// <summary>
        /// Plaintext version of the latest digest, formatted for inline injection
        /// into the AI prompt's MARKET CONTEXT block. Returns null when no digest
        /// exists yet (caller can decide whether to fall back to a placeholder).
        /// </summary>
        Task<string?> GetLatestDigestAsPromptTextAsync(int userId, CancellationToken ct = default);

        /// <summary>
        /// Articles that fell into the digest's time window, optionally filtered
        /// by category. Used by the dashboard drill-down view; the digest itself
        /// doesn't store article references, so we approximate by re-querying the
        /// PublishedAt window of the latest digest.
        /// </summary>
        Task<IReadOnlyList<NewsArticle>> GetArticlesForLatestDigestAsync(int userId, string? category = null, CancellationToken ct = default);
    }

    public sealed class NewsDigestService : INewsDigestService
    {
        private readonly ApplicationDbContext _db;

        public NewsDigestService(ApplicationDbContext db)
        {
            _db = db;
        }

        public Task<NewsDigest?> GetLatestDigestAsync(int userId, CancellationToken ct = default) =>
            _db.NewsDigests
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.GeneratedAt)
                .FirstOrDefaultAsync(ct);

        public async Task<string?> GetLatestDigestAsPromptTextAsync(int userId, CancellationToken ct = default)
        {
            var digest = await GetLatestDigestAsync(userId, ct);
            if (digest == null) return null;

            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"News digest as of {digest.GeneratedAt:yyyy-MM-dd HH:mm}Z (covering {digest.ArticleCount} articles)");
            if (!string.IsNullOrWhiteSpace(digest.Headline))
                sb.AppendLine($"Headline: {digest.Headline}");
            if (!string.IsNullOrWhiteSpace(digest.OverallSentiment))
            {
                var conf = digest.Confidence.HasValue ? $" (confidence {digest.Confidence:F2})" : "";
                sb.AppendLine($"Overall sentiment: {digest.OverallSentiment}{conf}");
            }

            // Lead with the narrative summary so the AI gets the "morning briefing"
            // framing up front. The per-category breakdowns then follow for the AI's
            // own analysis to draw on, but the narrative carries the editorial weight.
            if (!string.IsNullOrWhiteSpace(digest.NarrativeSummary))
            {
                sb.AppendLine();
                sb.AppendLine("[Briefing]");
                sb.AppendLine(digest.NarrativeSummary.Trim());
            }

            void Append(string label, string? body)
            {
                if (string.IsNullOrWhiteSpace(body)) return;
                sb.AppendLine();
                sb.AppendLine($"[{label}]");
                sb.AppendLine(body.Trim());
            }

            Append("Macro / Fed", digest.MacroSummary);
            Append("Federal employee context", digest.FederalSummary);
            Append("Holdings", digest.HoldingsSummary);
            Append("Regulatory / Tax", digest.RegulatorySummary);
            Append("Weather / Disasters", digest.WeatherSummary);
            Append("Geopolitical", digest.GeopoliticalSummary);
            Append("Crypto", digest.CryptoSummary);

            return sb.ToString().TrimEnd();
        }

        public async Task<IReadOnlyList<NewsArticle>> GetArticlesForLatestDigestAsync(int userId, string? category = null, CancellationToken ct = default)
        {
            var digest = await GetLatestDigestAsync(userId, ct);
            if (digest == null) return Array.Empty<NewsArticle>();

            // Use the digest's PeriodStart / PeriodEnd window. Articles outside
            // that window were either old (filtered out at synthesis time) or
            // newer (will appear in tomorrow's digest).
            var query = _db.NewsArticles
                .Where(a => a.PublishedAt >= digest.PeriodStart && a.PublishedAt <= digest.PeriodEnd);

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(a => a.Category == category);
            }

            return await query
                .OrderByDescending(a => a.PublishedAt)
                .Take(100)
                .ToListAsync(ct);
        }
    }
}
