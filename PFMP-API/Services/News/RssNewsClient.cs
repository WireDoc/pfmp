using System.Xml.Linq;
using PFMP_API.Models.News;

namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Fetches and parses RSS 2.0 / Atom feeds into NewsArticle objects.
    /// Stateless; the caller is responsible for deduplication against the DB.
    /// Ported from OmniTrader's bot/src/rss_client.py with adjustments for
    /// .NET and the wider PFMP feed set.
    /// </summary>
    public interface IRssNewsClient
    {
        Task<IReadOnlyList<NewsArticle>> FetchFeedAsync(RssFeedDefinition feed, CancellationToken ct = default);
        Task<IReadOnlyList<NewsArticle>> FetchAllAsync(IEnumerable<RssFeedDefinition> feeds, CancellationToken ct = default);
    }

    /// <summary>
    /// One RSS source the ingestion job will poll. Held in config rather than the DB
    /// for v1 — graduates to a SettingsTable-driven list once we want per-user
    /// curation (a post-Wave-23 follow-up).
    /// </summary>
    public sealed record RssFeedDefinition(string Source, string Url, string DefaultCategory)
    {
        public override string ToString() => $"{Source} @ {Url}";
    }

    public sealed class RssNewsClient : IRssNewsClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<RssNewsClient> _logger;

        public RssNewsClient(IHttpClientFactory httpClientFactory, ILogger<RssNewsClient> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<IReadOnlyList<NewsArticle>> FetchAllAsync(
            IEnumerable<RssFeedDefinition> feeds,
            CancellationToken ct = default)
        {
            var all = new List<NewsArticle>();
            foreach (var feed in feeds)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var fetched = await FetchFeedAsync(feed, ct);
                    all.AddRange(fetched);
                }
                catch (Exception ex)
                {
                    // Individual feed failures must not break the run — note and continue.
                    _logger.LogWarning(ex, "RSS feed {Feed} failed to fetch; skipping for this run", feed);
                }
            }
            return all;
        }

        public async Task<IReadOnlyList<NewsArticle>> FetchFeedAsync(RssFeedDefinition feed, CancellationToken ct = default)
        {
            using var client = _httpClientFactory.CreateClient("News");
            // Some feed CDNs reject default user agents
            if (!client.DefaultRequestHeaders.UserAgent.Any())
                client.DefaultRequestHeaders.UserAgent.ParseAdd("PFMP-NewsAggregator/1.0 (+local)");
            client.Timeout = TimeSpan.FromSeconds(20);

            using var resp = await client.GetAsync(feed.Url, ct);
            resp.EnsureSuccessStatusCode();

            var content = await resp.Content.ReadAsStringAsync(ct);
            var doc = XDocument.Parse(content);

            var articles = ParseRss20(doc, feed);
            if (articles.Count == 0)
            {
                // Try Atom — used by some federal feeds and a few outlets
                articles = ParseAtom(doc, feed);
            }

            _logger.LogDebug("RSS feed {Source} returned {Count} articles", feed.Source, articles.Count);
            return articles;
        }

        // ===== Format-specific parsing =====

        /// <summary>
        /// RSS 2.0: rss > channel > item with title / link / pubDate / description.
        /// </summary>
        private static List<NewsArticle> ParseRss20(XDocument doc, RssFeedDefinition feed)
        {
            var items = doc.Descendants("item").ToList();
            var articles = new List<NewsArticle>(items.Count);

            foreach (var item in items)
            {
                var title = (string?)item.Element("title") ?? "";
                var url = (string?)item.Element("link") ?? "";
                var pubDateText = (string?)item.Element("pubDate") ?? "";
                var description = (string?)item.Element("description");

                title = title.Trim();
                url = url.Trim();

                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(url))
                    continue;

                articles.Add(new NewsArticle
                {
                    Source = feed.Source,
                    Title = Truncate(title, 500),
                    Url = Truncate(url, 1000),
                    Summary = Truncate(StripHtmlBasic(description), 4000),
                    PublishedAt = ParsePubDate(pubDateText),
                    FetchedAt = DateTime.UtcNow,
                    Category = feed.DefaultCategory,
                });
            }

            return articles;
        }

        /// <summary>
        /// Atom: feed > entry with title / link[@href] / updated / summary | content.
        /// </summary>
        private static List<NewsArticle> ParseAtom(XDocument doc, RssFeedDefinition feed)
        {
            XNamespace atom = "http://www.w3.org/2005/Atom";
            var entries = doc.Descendants(atom + "entry").ToList();
            var articles = new List<NewsArticle>(entries.Count);

            foreach (var entry in entries)
            {
                var title = (string?)entry.Element(atom + "title") ?? "";
                var url = entry.Element(atom + "link")?.Attribute("href")?.Value ?? "";
                var updatedText = (string?)entry.Element(atom + "updated")
                                  ?? (string?)entry.Element(atom + "published")
                                  ?? "";
                var summary = (string?)entry.Element(atom + "summary")
                              ?? (string?)entry.Element(atom + "content");

                title = title.Trim();
                url = url.Trim();
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(url))
                    continue;

                articles.Add(new NewsArticle
                {
                    Source = feed.Source,
                    Title = Truncate(title, 500),
                    Url = Truncate(url, 1000),
                    Summary = Truncate(StripHtmlBasic(summary), 4000),
                    PublishedAt = ParseAtomDate(updatedText),
                    FetchedAt = DateTime.UtcNow,
                    Category = feed.DefaultCategory,
                });
            }

            return articles;
        }

        // ===== Helpers =====

        private static DateTime ParsePubDate(string raw)
        {
            // RFC 822 / RFC 1123 (e.g. "Sun, 21 Jun 2026 12:34:56 GMT")
            if (DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal,
                out var parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }
            return DateTime.UtcNow;
        }

        private static DateTime ParseAtomDate(string raw)
        {
            // ISO 8601 (e.g. "2026-06-21T12:34:56Z")
            if (DateTimeOffset.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AdjustToUniversal,
                out var parsed))
            {
                return parsed.UtcDateTime;
            }
            return DateTime.UtcNow;
        }

        /// <summary>
        /// Strip the common HTML noise (tags + entities) from RSS descriptions without
        /// pulling in an HTML parser. Good enough for routing + display; we're not
        /// re-rendering article bodies.
        /// </summary>
        private static string? StripHtmlBasic(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return input;
            var s = System.Text.RegularExpressions.Regex.Replace(input, "<.*?>", " ");
            s = System.Net.WebUtility.HtmlDecode(s);
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", " ").Trim();
            return s;
        }

        private static string Truncate(string? input, int max) =>
            string.IsNullOrEmpty(input) ? string.Empty : (input.Length <= max ? input : input[..max]);
    }
}
