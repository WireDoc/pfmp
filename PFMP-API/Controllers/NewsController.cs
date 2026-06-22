using Hangfire;
using Microsoft.AspNetCore.Mvc;
using PFMP_API.Jobs;
using PFMP_API.Models.News;
using PFMP_API.Services.News;

namespace PFMP_API.Controllers;

/// <summary>
/// Wave 23 — News digest API for the dashboard widget + drill-down view.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class NewsController : ControllerBase
{
    private readonly INewsDigestService _digests;
    private readonly ILogger<NewsController> _logger;

    public NewsController(INewsDigestService digests, ILogger<NewsController> logger)
    {
        _digests = digests;
        _logger = logger;
    }

    /// <summary>
    /// Returns the latest digest for a user, or 404 when none exists yet.
    /// </summary>
    [HttpGet("digest")]
    public async Task<ActionResult<NewsDigestResponse>> GetLatestDigest(
        [FromQuery] int userId,
        CancellationToken ct)
    {
        var digest = await _digests.GetLatestDigestAsync(userId, ct);
        if (digest == null)
        {
            return NotFound(new { message = "No digest available yet — run the ingestion job or wait for tomorrow's 05:30 ET cron." });
        }

        return Ok(NewsDigestResponse.From(digest));
    }

    /// <summary>
    /// Returns the supporting articles for the latest digest, optionally filtered
    /// by category. Used by the drill-down view to render the source article list.
    /// </summary>
    [HttpGet("articles")]
    public async Task<ActionResult<IReadOnlyList<NewsArticleResponse>>> GetArticles(
        [FromQuery] int userId,
        [FromQuery] string? category,
        CancellationToken ct)
    {
        var articles = await _digests.GetArticlesForLatestDigestAsync(userId, category, ct);
        return Ok(articles.Select(NewsArticleResponse.From).ToList());
    }

    /// <summary>
    /// Manually triggers the news ingestion job (queued in Hangfire). Used by the
    /// admin "refresh now" button + for first-run priming. Idempotent — multiple
    /// triggers in a row will queue multiple jobs but only the latest matters.
    /// </summary>
    [HttpPost("trigger")]
    public ActionResult<NewsTriggerResponse> TriggerIngestion()
    {
        var jobId = BackgroundJob.Enqueue<NewsIngestionJob>(j => j.RunAsync(CancellationToken.None));
        _logger.LogInformation("[NewsController] Manual ingestion triggered, jobId={JobId}", jobId);
        return Accepted(new NewsTriggerResponse(jobId));
    }
}

// ===== Response DTOs =====

public sealed record NewsDigestResponse(
    int DigestId,
    int UserId,
    DateTime GeneratedAt,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string? Headline,
    string? NarrativeSummary,
    string? OverallSentiment,
    decimal? Confidence,
    int ArticleCount,
    NewsDigestCategories Categories,
    decimal LlmCostUsd)
{
    public static NewsDigestResponse From(NewsDigest d) => new(
        DigestId: d.NewsDigestId,
        UserId: d.UserId,
        GeneratedAt: d.GeneratedAt,
        PeriodStart: d.PeriodStart,
        PeriodEnd: d.PeriodEnd,
        Headline: d.Headline,
        NarrativeSummary: d.NarrativeSummary,
        OverallSentiment: d.OverallSentiment,
        Confidence: d.Confidence,
        ArticleCount: d.ArticleCount,
        Categories: new NewsDigestCategories(
            Macro: d.MacroSummary,
            Federal: d.FederalSummary,
            Holdings: d.HoldingsSummary,
            Weather: d.WeatherSummary,
            Regulatory: d.RegulatorySummary,
            Crypto: d.CryptoSummary,
            Geopolitical: d.GeopoliticalSummary),
        LlmCostUsd: d.LlmCostUsd);
}

public sealed record NewsDigestCategories(
    string? Macro,
    string? Federal,
    string? Holdings,
    string? Weather,
    string? Regulatory,
    string? Crypto,
    string? Geopolitical);

public sealed record NewsArticleResponse(
    int ArticleId,
    string Source,
    string Title,
    string Url,
    string? Summary,
    DateTime PublishedAt,
    string? Category,
    string? Tags)
{
    public static NewsArticleResponse From(NewsArticle a) => new(
        ArticleId: a.NewsArticleId,
        Source: a.Source,
        Title: a.Title,
        Url: a.Url,
        Summary: a.Summary,
        PublishedAt: a.PublishedAt,
        Category: a.Category,
        Tags: a.Tags);
}

public sealed record NewsTriggerResponse(string JobId);
