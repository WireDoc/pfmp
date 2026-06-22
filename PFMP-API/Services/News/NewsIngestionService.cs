using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.News;
using PFMP_API.Services.AI;

namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Orchestrates one ingestion run end-to-end:
    ///   1. Resolve the feed set (global + per-state + per-held-ticker).
    ///   2. Fetch all feeds via RssNewsClient.
    ///   3. Dedup against the NewsArticles table (URL is the unique key).
    ///   4. Categorize + tag each new article.
    ///   5. Persist new articles.
    ///   6. For each eligible user: gather their relevant articles, build the
    ///      personalized prompt, call Gemini Flash, parse the JSON response,
    ///      and persist a NewsDigest row.
    ///
    /// Cancellation-aware and tolerant of individual-feed failures: a single
    /// dead feed never breaks the run.
    /// </summary>
    public interface INewsIngestionService
    {
        Task<NewsIngestionResult> RunOnceAsync(CancellationToken ct = default);
    }

    public sealed record NewsIngestionResult(
        int ArticlesFetched,
        int ArticlesNew,
        int DigestsCreated,
        decimal TotalCostUsd,
        TimeSpan Duration,
        IReadOnlyList<string> Warnings
    );

    public sealed class NewsIngestionService : INewsIngestionService
    {
        private readonly ApplicationDbContext _db;
        private readonly IRssNewsClient _rss;
        private readonly INewsCategorizer _categorizer;
        private readonly INewsPromptBuilder _promptBuilder;
        private readonly IEnumerable<IAIFinancialAdvisor> _advisors;
        private readonly ILogger<NewsIngestionService> _logger;

        public NewsIngestionService(
            ApplicationDbContext db,
            IRssNewsClient rss,
            INewsCategorizer categorizer,
            INewsPromptBuilder promptBuilder,
            IEnumerable<IAIFinancialAdvisor> advisors,
            ILogger<NewsIngestionService> logger)
        {
            _db = db;
            _rss = rss;
            _categorizer = categorizer;
            _promptBuilder = promptBuilder;
            _advisors = advisors;
            _logger = logger;
        }

        public async Task<NewsIngestionResult> RunOnceAsync(CancellationToken ct = default)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var warnings = new List<string>();

            // ===== 1. Eligible users + their context =====
            var users = await _db.Users
                .Where(u => u.IsActive && !u.IsTestAccount)
                .ToListAsync(ct);

            if (users.Count == 0)
            {
                _logger.LogInformation("News ingestion: no eligible users; skipping run");
                return new NewsIngestionResult(0, 0, 0, 0m, stopwatch.Elapsed, warnings);
            }

            // Build per-user profiles once so we can also build the union ticker set
            // (used by the categorizer to tag any holdings-relevant article in one pass).
            var profiles = new Dictionary<int, NewsUserProfile>();
            var unionTickers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var user in users)
            {
                var profile = await BuildUserProfileAsync(user, ct);
                profiles[user.UserId] = profile;
                foreach (var t in profile.HeldTickers) unionTickers.Add(t);
            }

            // ===== 2. Resolve the feed set =====
            var feeds = new List<RssFeedDefinition>(NewsFeedRegistry.GlobalFeeds);

            // Per-state NWS feeds — one per distinct state we see across users.
            var distinctStates = profiles.Values
                .Select(p => p.StateOfResidence)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase);
            foreach (var s in distinctStates)
            {
                var nws = NewsFeedRegistry.NwsFeedForState(s);
                if (nws != null) feeds.Add(nws);
            }

            // Per-ticker Yahoo feeds — union across users keeps the fetch count proportional
            // to the active portfolio universe across the system (not per-user × per-ticker).
            foreach (var t in unionTickers)
            {
                feeds.Add(NewsFeedRegistry.YahooFeedForTicker(t));
            }

            _logger.LogInformation("News ingestion: fetching {Count} feeds across {UserCount} users", feeds.Count, users.Count);

            // ===== 3. Fetch =====
            var fetched = await _rss.FetchAllAsync(feeds, ct);

            // ===== 4. Dedup =====
            var fetchedUrls = fetched.Select(a => a.Url).ToHashSet();
            var existingUrls = await _db.NewsArticles
                .Where(a => fetchedUrls.Contains(a.Url))
                .Select(a => a.Url)
                .ToHashSetAsync(ct);

            var newArticles = fetched
                .Where(a => !existingUrls.Contains(a.Url))
                // de-dup within the same fetch batch (some feeds republish the same item)
                .GroupBy(a => a.Url)
                .Select(g => g.First())
                .ToList();

            // ===== 5. Categorize + persist =====
            foreach (var article in newArticles)
            {
                _categorizer.Categorize(article, unionTickers);
                _db.NewsArticles.Add(article);
            }

            if (newArticles.Count > 0)
            {
                await _db.SaveChangesAsync(ct);
            }

            _logger.LogInformation("News ingestion: fetched={Fetched}, new={New}", fetched.Count, newArticles.Count);

            // ===== 6. Per-user digest synthesis =====
            //
            // Pull a wider window than just "new this run" — typically the last 24h —
            // because the digest is a "what's relevant to you today" view, not a strict
            // "since-last-run" diff. Articles seen on yesterday's run that are still
            // material today should still appear.
            var since = DateTime.UtcNow.AddHours(-30);
            var windowArticles = await _db.NewsArticles
                .Where(a => a.PublishedAt >= since)
                .OrderByDescending(a => a.PublishedAt)
                .ToListAsync(ct);

            // Skip the synthesis call entirely when there's no new material since
            // the last digest — saves the LLM cost on quiet days.
            int digestsCreated = 0;
            decimal totalCost = 0m;

            var newsAdvisor = _advisors.FirstOrDefault(a => a.ServiceName == "News");
            if (newsAdvisor == null)
            {
                warnings.Add("No IAIFinancialAdvisor with role=News registered; skipping synthesis");
            }
            else
            {
                foreach (var (userId, profile) in profiles)
                {
                    if (ct.IsCancellationRequested) break;

                    var relevant = FilterRelevantForUser(windowArticles, profile);
                    if (relevant.Count == 0)
                    {
                        _logger.LogDebug("News ingestion: user {UserId} had no relevant articles; no digest", userId);
                        continue;
                    }

                    try
                    {
                        var digest = await SynthesizeDigestAsync(profile, relevant, newsAdvisor, ct);
                        if (digest != null)
                        {
                            _db.NewsDigests.Add(digest);
                            digestsCreated++;
                            totalCost += digest.LlmCostUsd;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "News ingestion: digest synthesis failed for user {UserId}", userId);
                        warnings.Add($"user {userId}: synthesis failed ({ex.GetType().Name})");
                    }
                }

                if (digestsCreated > 0)
                {
                    await _db.SaveChangesAsync(ct);
                }
            }

            stopwatch.Stop();
            return new NewsIngestionResult(
                ArticlesFetched: fetched.Count,
                ArticlesNew: newArticles.Count,
                DigestsCreated: digestsCreated,
                TotalCostUsd: totalCost,
                Duration: stopwatch.Elapsed,
                Warnings: warnings);
        }

        // ===== Helpers =====

        private async Task<NewsUserProfile> BuildUserProfileAsync(User user, CancellationToken ct)
        {
            // Federal status comes straight off the User row.
            var isFederal = user.IsGovernmentEmployee;

            // State of residence — prefer TaxProfile, fall back to nothing.
            var stateOfResidence = await _db.TaxProfiles
                .Where(t => t.UserId == user.UserId)
                .Select(t => t.StateOfResidence)
                .FirstOrDefaultAsync(ct);

            // Life-stage bracket — coarse: accumulation < 50, near-retirement 50-65, in-retirement > 65.
            string? ageBracket = null;
            if (user.DateOfBirth.HasValue)
            {
                var age = (int)((DateTime.UtcNow - user.DateOfBirth.Value).TotalDays / 365.25);
                ageBracket = age switch
                {
                    < 50 => "accumulation",
                    >= 50 and < 65 => "near-retirement",
                    _ => "in-retirement",
                };
            }

            // Tickers from Holdings. Only investment-style accounts; cash account
            // "holdings" don't exist and TSP fund codes (G/F/C/S/I/L*) aren't proper
            // tickers for news feeds.
            var tickers = await _db.Holdings
                .Where(h => h.Symbol != null && h.Symbol != "")
                .Join(_db.Accounts.Where(a => a.UserId == user.UserId), h => h.AccountId, a => a.AccountId, (h, a) => h.Symbol!)
                .Distinct()
                .ToListAsync(ct);

            // Extra interests from the user's profile context — for v1 keep this lean.
            var extras = new List<string>();
            if (user.VADisabilityPercentage.HasValue && user.VADisabilityPercentage > 0)
                extras.Add("VA disability");

            return new NewsUserProfile(
                UserId: user.UserId,
                IsFederalEmployee: isFederal,
                StateOfResidence: stateOfResidence,
                AgeBracket: ageBracket,
                HeldTickers: tickers,
                ExtraInterests: extras);
        }

        private static IReadOnlyList<NewsArticle> FilterRelevantForUser(IReadOnlyList<NewsArticle> all, NewsUserProfile profile)
        {
            // Inclusion rules:
            //  • macro, regulatory, geopolitical → relevant to everyone
            //  • federal → relevant only if user is federal
            //  • weather → relevant only if the article is tagged with the user's state
            //              (rough proxy: the NWS feed name includes the state code)
            //  • holdings → relevant only if the Tags include one of the user's tickers
            //  • crypto → relevant to everyone (broad BTC context; rare enough to keep in)
            var heldUpper = profile.HeldTickers.Select(t => t.ToUpperInvariant()).ToHashSet();
            var stateUpper = profile.StateOfResidence?.Trim().ToUpperInvariant();

            return all.Where(a =>
            {
                switch (a.Category)
                {
                    case "macro":
                    case "regulatory":
                    case "geopolitical":
                    case "crypto":
                        return true;
                    case "federal":
                        return profile.IsFederalEmployee;
                    case "weather":
                        // Crude: NWS source names look like "NWS:AR".
                        if (string.IsNullOrEmpty(stateUpper)) return false;
                        return a.Source.EndsWith($":{stateUpper}", StringComparison.OrdinalIgnoreCase);
                    case "holdings":
                        if (string.IsNullOrEmpty(a.Tags)) return false;
                        return a.Tags.Split(',').Any(t => heldUpper.Contains(t.Trim().ToUpperInvariant()));
                    default:
                        return true;
                }
            }).ToList();
        }

        private async Task<NewsDigest?> SynthesizeDigestAsync(
            NewsUserProfile profile,
            IReadOnlyList<NewsArticle> relevant,
            IAIFinancialAdvisor advisor,
            CancellationToken ct)
        {
            var prompt = _promptBuilder.Build(profile, relevant);

            var aiRequest = new AIPromptRequest
            {
                UserId = profile.UserId.ToString(),
                SystemPrompt = prompt.SystemPrompt,
                UserPrompt = prompt.UserPrompt,
                MaxTokens = prompt.MaxTokens,
                Temperature = prompt.Temperature,
                Mode = AIPromptMode.News,
            };

            var rec = await advisor.GetRecommendationAsync(aiRequest);
            if (rec == null || string.IsNullOrWhiteSpace(rec.RecommendationText))
            {
                _logger.LogWarning("News synthesis: empty response for user {UserId}", profile.UserId);
                return null;
            }

            // Parse the JSON. Gemini Flash is mostly well-behaved with our
            // explicit "no markdown fence" framing, but defend against the rare
            // ```json prefix anyway.
            var rawJson = ExtractJsonBlock(rec.RecommendationText);
            var parsed = TryParseDigestJson(rawJson, profile.UserId);
            if (parsed == null)
            {
                return null;
            }

            return new NewsDigest
            {
                UserId = profile.UserId,
                GeneratedAt = DateTime.UtcNow,
                PeriodStart = relevant.Min(a => a.PublishedAt),
                PeriodEnd = DateTime.UtcNow,
                RawJson = rawJson,
                Headline = parsed.Headline,
                NarrativeSummary = parsed.NarrativeSummary,
                OverallSentiment = parsed.OverallSentiment,
                Confidence = parsed.Confidence,
                MacroSummary = parsed.Macro,
                FederalSummary = parsed.Federal,
                HoldingsSummary = parsed.Holdings,
                WeatherSummary = parsed.Weather,
                RegulatorySummary = parsed.Regulatory,
                CryptoSummary = parsed.Crypto,
                GeopoliticalSummary = parsed.Geopolitical,
                ArticleCount = relevant.Count,
                PromptTokens = (int)(rec.Metadata?.GetValueOrDefault("PromptTokens") as long? ?? rec.TokensUsed / 2),
                CompletionTokens = (int)(rec.Metadata?.GetValueOrDefault("CompletionTokens") as long? ?? rec.TokensUsed / 2),
                LlmCostUsd = rec.EstimatedCost,
            };
        }

        private static string ExtractJsonBlock(string text)
        {
            // Strip ```json … ``` fences if the model returned them despite instructions.
            var trimmed = text.Trim();
            if (trimmed.StartsWith("```"))
            {
                var firstNewline = trimmed.IndexOf('\n');
                if (firstNewline > 0) trimmed = trimmed[(firstNewline + 1)..];
                if (trimmed.EndsWith("```")) trimmed = trimmed[..^3];
                trimmed = trimmed.Trim();
            }
            return trimmed;
        }

        private sealed record ParsedDigest(
            string? Headline,
            string? NarrativeSummary,
            string? OverallSentiment,
            decimal? Confidence,
            string? Macro,
            string? Federal,
            string? Holdings,
            string? Weather,
            string? Regulatory,
            string? Crypto,
            string? Geopolitical);

        private ParsedDigest? TryParseDigestJson(string json, int userId)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                string? GetString(string key) =>
                    root.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
                        ? v.GetString()
                        : null;

                string? GetCategoryString(string key) =>
                    root.TryGetProperty("categories", out var cats) && cats.ValueKind == JsonValueKind.Object
                        && cats.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
                        ? v.GetString()
                        : null;

                decimal? confidence = null;
                if (root.TryGetProperty("confidence", out var c) && c.ValueKind == JsonValueKind.Number
                    && c.TryGetDecimal(out var cd))
                {
                    confidence = Math.Clamp(cd, 0m, 1m);
                }

                return new ParsedDigest(
                    Headline: GetString("headline"),
                    NarrativeSummary: GetString("narrative_summary"),
                    OverallSentiment: GetString("overall_sentiment"),
                    Confidence: confidence,
                    Macro: GetCategoryString("macro"),
                    Federal: GetCategoryString("federal"),
                    Holdings: GetCategoryString("holdings"),
                    Weather: GetCategoryString("weather"),
                    Regulatory: GetCategoryString("regulatory"),
                    Crypto: GetCategoryString("crypto"),
                    Geopolitical: GetCategoryString("geopolitical"));
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "News synthesis: JSON parse failed for user {UserId}; raw len={Len}", userId, json.Length);
                return null;
            }
        }
    }
}
