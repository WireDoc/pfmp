using System.Text;
using PFMP_API.Models.News;

namespace PFMP_API.Services.News
{
    /// <summary>
    /// Wave 23 — Builds the synthesis prompt for Gemini Flash. The prompt includes:
    ///   1. The user's profile context (federal status, state, holdings, life stage)
    ///      so the model can decide what's relevant TO THIS USER.
    ///   2. The article list grouped by category.
    ///   3. A strict JSON output schema the consumer can rely on.
    /// </summary>
    public interface INewsPromptBuilder
    {
        NewsPromptInput Build(NewsUserProfile profile, IReadOnlyList<NewsArticle> relevantArticles);
    }

    /// <summary>
    /// User context the categorizer + prompt builder use to decide relevance.
    /// Loaded by NewsIngestionService from the user's existing profile data.
    /// </summary>
    public sealed record NewsUserProfile(
        int UserId,
        bool IsFederalEmployee,
        string? StateOfResidence,
        string? AgeBracket,                   // "accumulation" | "near-retirement" | "in-retirement" | null
        IReadOnlyList<string> HeldTickers,
        IReadOnlyList<string> ExtraInterests  // free-form (e.g. "real estate", "VA disability") — used by the prompt
    );

    /// <summary>
    /// What we hand off to the LLM advisor: system prompt + user prompt + the
    /// suggested temperature / max-tokens. Wrapped so the orchestrator can also
    /// log it for cost-tracking + debug.
    /// </summary>
    public sealed record NewsPromptInput(string SystemPrompt, string UserPrompt, decimal Temperature, int MaxTokens);

    public sealed class NewsPromptBuilder : INewsPromptBuilder
    {
        // Keep the system prompt small — Gemini Flash is fastest with concise framing.
        private const string SystemPrompt = @"You are PFMP's news synthesizer. You read news articles and produce a structured daily digest tailored to one specific user's financial situation.

Your job is to surface what THIS USER should be paying attention to today. Filter out noise. Connect macro events to the user's specific portfolio, employment, and life stage. Keep summaries factual and short (2-4 sentences per category).

Respond with ONE JSON object only. No markdown fences. No preamble. The schema is:
{
  ""headline"": ""one-line summary of the most important thing for this user today (<=120 chars)"",
  ""narrative_summary"": ""2-3 short paragraphs written like a morning radio briefing for this specific user, weaving the threads together with connecting sentences — what's happening, why it matters to them, and what to watch next. Plain prose, no bullets, no markdown. Each paragraph 2-4 sentences."",
  ""overall_sentiment"": ""bullish|cautiously_bullish|neutral|cautiously_bearish|bearish|mixed"",
  ""confidence"": 0.0 to 1.0,
  ""categories"": {
    ""macro"":        ""..."" | null,
    ""federal"":      ""..."" | null,
    ""holdings"":     ""..."" | null,
    ""weather"":      ""..."" | null,
    ""regulatory"":   ""..."" | null,
    ""crypto"":       ""..."" | null,
    ""geopolitical"": ""..."" | null
  }
}

The narrative_summary is the headline event: 2-3 paragraphs of flowing prose. Open with the biggest story affecting this user today. Connect threads (e.g., 'meanwhile…', 'the same day…', 'against that backdrop…'). Close with what to watch next. Address the user directly when natural ('your tech holdings', 'your TSP allocation').
For each category, return null when there's nothing material this period. Don't pad with filler.
For 'holdings', specifically mention the user's tickers when articles affect them.
For 'federal', call out anything affecting federal pay, TSP, FEHB, FERS, OPM, or shutdown risk.
For 'weather', only mention events in or affecting the user's state.";

        public NewsPromptInput Build(NewsUserProfile profile, IReadOnlyList<NewsArticle> relevantArticles)
        {
            var sb = new StringBuilder();

            // ===== USER CONTEXT =====
            sb.AppendLine("=== USER CONTEXT ===");
            if (profile.IsFederalEmployee)
                sb.AppendLine("- Federal employee — government shutdown, pay decisions, OPM changes, TSP fund changes are all directly relevant.");
            else
                sb.AppendLine("- Civilian employee — federal-specific news has limited relevance.");

            if (!string.IsNullOrWhiteSpace(profile.StateOfResidence))
                sb.AppendLine($"- State: {profile.StateOfResidence} (filter weather + state-tax news to this state).");

            if (!string.IsNullOrWhiteSpace(profile.AgeBracket))
                sb.AppendLine($"- Life stage: {profile.AgeBracket}.");

            if (profile.HeldTickers.Count > 0)
                sb.AppendLine($"- Holds: {string.Join(", ", profile.HeldTickers)}.");

            if (profile.ExtraInterests.Count > 0)
                sb.AppendLine($"- Other interests: {string.Join(", ", profile.ExtraInterests)}.");

            sb.AppendLine();

            // ===== ARTICLES grouped by category =====
            sb.AppendLine($"=== {relevantArticles.Count} ARTICLES THIS PERIOD ===");

            // Sort: holdings first (most personally relevant), then federal, then macro, then everything else.
            var categoryOrder = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["holdings"] = 0,
                ["federal"] = 1,
                ["macro"] = 2,
                ["regulatory"] = 3,
                ["weather"] = 4,
                ["geopolitical"] = 5,
                ["crypto"] = 6,
                ["other"] = 7,
            };

            var grouped = relevantArticles
                .GroupBy(a => string.IsNullOrEmpty(a.Category) ? "other" : a.Category!)
                .OrderBy(g => categoryOrder.TryGetValue(g.Key, out var o) ? o : 99);

            foreach (var group in grouped)
            {
                sb.AppendLine($"\n[{group.Key.ToUpperInvariant()}]");
                foreach (var article in group.OrderByDescending(a => a.PublishedAt).Take(15))
                {
                    var tags = string.IsNullOrEmpty(article.Tags) ? "" : $" (tags: {article.Tags})";
                    sb.AppendLine($"- {article.PublishedAt:yyyy-MM-dd HH:mm}Z — [{article.Source}] {article.Title}{tags}");
                    if (!string.IsNullOrWhiteSpace(article.Summary))
                    {
                        var trimmed = article.Summary.Length > 240
                            ? article.Summary[..240] + "..."
                            : article.Summary;
                        sb.AppendLine($"   {trimmed}");
                    }
                }
            }

            sb.AppendLine();
            sb.AppendLine("Produce the JSON object now. No preamble. No commentary. Just the JSON.");

            return new NewsPromptInput(
                SystemPrompt: SystemPrompt,
                UserPrompt: sb.ToString(),
                // Slightly higher than analysis (0.3) — sentiment / narrative writing benefits
                // from a bit of variability but we still want consistency.
                Temperature: 0.4m,
                // 3000 leaves room for the narrative_summary (2-3 paragraphs, ~600 tokens) on
                // top of the per-category strings + headline + sentiment + confidence.
                MaxTokens: 3000);
        }
    }
}
