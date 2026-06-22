namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Default RSS feed set per the Wave 23 decision matrix (option C:
    /// broadest source set). Lives in code rather than the DB for v1; promotes to
    /// a SettingsTable-driven list once we want per-user curation (post-Wave-23).
    ///
    /// State-specific feeds (NWS severe weather) are emitted per-state by
    /// FeedsForUserState; the global list is used for everyone.
    /// </summary>
    public static class NewsFeedRegistry
    {
        /// <summary>
        /// Global feeds — these always run regardless of user.
        /// </summary>
        public static IReadOnlyList<RssFeedDefinition> GlobalFeeds { get; } = new[]
        {
            // ===== Macro / general business =====
            // Reuters + AP feeds were retired by both outlets pre-2026 (no replacement RSS published).
            // MarketWatch + BBC Business fill the gap for broad-coverage business news.
            new RssFeedDefinition("MarketWatch",     "https://feeds.content.dowjones.io/public/rss/mw_topstories", "macro"),
            new RssFeedDefinition("BBC-Business",    "https://feeds.bbci.co.uk/news/business/rss.xml", "macro"),
            new RssFeedDefinition("Bloomberg",       "https://feeds.bloomberg.com/markets/news.rss", "macro"),
            new RssFeedDefinition("NPR-Business",    "https://feeds.npr.org/1006/rss.xml", "macro"),

            // ===== Federal / regulatory =====
            // Treasury press-releases RSS path is no longer publicly served; their site is
            // reachable but doesn't expose a stable feed URL — left out for now.
            new RssFeedDefinition("FederalReserve",  "https://www.federalreserve.gov/feeds/press_all.xml", "macro"),
            new RssFeedDefinition("SEC",             "https://www.sec.gov/news/pressreleases.rss", "regulatory"),

            // ===== Federal employee specific =====
            // TSP (403 anti-bot block on /news-and-resources/feed/) and OPM (no /news/rss/ exists)
            // do NOT publish public RSS feeds. Coverage of TSP / FERS / OPM news will come from
            // general business outlets above, or from a future paid news API (Phase 2).
        };

        /// <summary>
        /// Per-ticker Yahoo Finance feeds. Only the tickers the user actually holds
        /// get fetched, which keeps the per-run feed count proportional to the
        /// active portfolio rather than the entire stock universe.
        /// </summary>
        public static RssFeedDefinition YahooFeedForTicker(string symbol)
        {
            var t = symbol.Trim().ToUpperInvariant();
            return new RssFeedDefinition(
                Source: $"Yahoo:{t}",
                Url: $"https://feeds.finance.yahoo.com/rss/2.0/headline?s={Uri.EscapeDataString(t)}&region=US&lang=en-US",
                DefaultCategory: "holdings");
        }

        /// <summary>
        /// Per-state severe weather Atom feed from the modern NWS API. The legacy
        /// alerts.weather.gov/cap/{state}.php endpoint was deprecated in favor of
        /// api.weather.gov; the old URL now returns DNS failures.
        /// Only emits if we have a 2-letter state code; falls back to nothing for
        /// malformed input.
        /// </summary>
        public static RssFeedDefinition? NwsFeedForState(string? stateCode)
        {
            if (string.IsNullOrWhiteSpace(stateCode)) return null;
            var s = stateCode.Trim().ToUpperInvariant();
            if (s.Length != 2) return null;
            return new RssFeedDefinition(
                Source: $"NWS:{s}",
                Url: $"https://api.weather.gov/alerts/active.atom?area={s}",
                DefaultCategory: "weather");
        }
    }
}
