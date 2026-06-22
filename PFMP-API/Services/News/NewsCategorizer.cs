using System.Text.RegularExpressions;
using PFMP_API.Models.News;

namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Decides which category an article belongs to and tags it with
    /// matched keywords / ticker symbols. Holdings-aware: per-ingestion-run the
    /// categorizer is seeded with the set of distinct ticker symbols held by any
    /// user, so articles matching those tickers get tagged for downstream
    /// per-user relevance filtering.
    /// </summary>
    public interface INewsCategorizer
    {
        /// <summary>
        /// Mutates the article in place: sets Category (overriding the feed's
        /// default if a more specific match is found) and Tags. Returns the
        /// article for chaining convenience.
        /// </summary>
        NewsArticle Categorize(NewsArticle article, ISet<string> heldTickerSymbols);
    }

    public sealed class NewsCategorizer : INewsCategorizer
    {
        // ===== Category keyword patterns =====
        // Order matters: the FIRST match wins (so federal employee keywords
        // override generic macro mentions, etc.). Federal first, then weather,
        // then regulatory, then macro, then crypto, then geopolitical, with
        // holdings tagged orthogonally via ticker matching.

        private static readonly (string Category, Regex Pattern)[] CategoryPatterns =
        {
            ("federal", new Regex(
                @"\b(government shutdown|federal employee|federal pay|federal workers|opm|office of personnel management|" +
                @"tsp|thrift savings plan|fers|csrs|federal pension|federal retirement|fehb|fedvip|fegli|fltcip|" +
                @"federal hiring|federal layoff|gs-?\d+|continuing resolution|congressional budget|federal furlough|" +
                @"social security administration|medicare(?: part [a-d])?|ssa)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),

            ("weather", new Regex(
                @"\b(hurricane|tornado|earthquake|wildfire|tropical storm|flooding|flood watch|severe storm|" +
                @"national weather service|emergency declaration|fema)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),

            ("regulatory", new Regex(
                @"\b(sec(?: enforcement)?|securities and exchange|cfpb|finra|fdic|" +
                @"tax law|tax code|secure act|rmd|required minimum distribution|" +
                @"401\(k\) rules|ira rules|roth (?:rules|conversion)|" +
                @"new tax|tax bill|tax cut|tax hike|tax policy|tax reform|" +
                @"irs (?:notice|guidance|ruling))\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),

            ("macro", new Regex(
                @"\b(federal reserve|fed (?:rate|hike|cut|pause|holds|raised|lowered)|fomc|" +
                @"interest rate|prime rate|treasury yield|yield curve|" +
                @"inflation|cpi|pce|ppi|core inflation|" +
                @"jobs report|nonfarm payrolls|unemployment rate|labor market|" +
                @"gdp|recession|soft landing|economic growth|" +
                @"consumer confidence|consumer sentiment|retail sales|" +
                @"manufacturing pmi|services pmi|ism)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),

            ("crypto", new Regex(
                @"\b(bitcoin|btc|ethereum|eth|crypto(?:currency)?|stablecoin|defi|" +
                @"spot etf|bitcoin etf|crypto regulation|sec crypto)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),

            ("geopolitical", new Regex(
                @"\b(election|presidential|congress|senate|house of representatives|" +
                @"tariff|trade war|trade deal|sanctions|" +
                @"war in|invasion|ceasefire|nato|opec\+?|" +
                @"china (?:trade|policy|tariff)|russia (?:sanctions|policy)|" +
                @"middle east|israel|iran|north korea)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled)),
        };

        // ===== Tag extraction =====
        // Generic keywords we always tag (independent of routing). Useful for
        // post-hoc filtering or downstream display.
        private static readonly Regex BroadKeywords = new(
            @"\b(fed|inflation|recession|treasury|tariff|election|shutdown|tsp|fehb)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public NewsArticle Categorize(NewsArticle article, ISet<string> heldTickerSymbols)
        {
            var text = $"{article.Title} {article.Summary}".ToLowerInvariant();

            // Category override: only override the feed's default if we have a
            // confident specific match. A Reuters article that hits federal keywords
            // becomes "federal" instead of "macro" (its feed default).
            foreach (var (cat, pattern) in CategoryPatterns)
            {
                if (pattern.IsMatch(text))
                {
                    article.Category = cat;
                    break;
                }
            }

            // Per-ticker tagging: per-holding routing in NewsPromptBuilder reads
            // these tags to find articles mentioning the user's specific positions.
            var matchedTickers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ticker in heldTickerSymbols)
            {
                if (ticker.Length < 2) continue; // skip single-char noise
                // Word-boundary match, case-insensitive. We do this in a single
                // regex per ticker rather than batched-OR because tickers can be
                // very different lengths and Regex.Escape per item is cheaper at
                // this scale than building one giant alternation.
                if (Regex.IsMatch(text, $@"\b{Regex.Escape(ticker)}\b", RegexOptions.IgnoreCase))
                {
                    matchedTickers.Add(ticker.ToUpperInvariant());
                }
            }

            // Broad keyword tags (always set, independent of category)
            var broadTags = BroadKeywords.Matches(text)
                .Select(m => m.Value.ToLowerInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Holdings-tagged articles get bumped to the "holdings" category so they
            // ride into the user's per-holding section even when their feed default
            // is "macro" or similar. But don't lose the original category — append
            // ticker tag, then override category.
            if (matchedTickers.Count > 0)
            {
                article.Category = "holdings";
            }

            var allTags = matchedTickers.Concat(broadTags)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct(StringComparer.OrdinalIgnoreCase);
            var joined = string.Join(",", allTags);
            article.Tags = string.IsNullOrEmpty(joined) ? null : Truncate(joined, 500);

            return article;
        }

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
    }
}
