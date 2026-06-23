using Hangfire;
using PFMP_API.Services.News;

namespace PFMP_API.Jobs;

/// <summary>
/// Wave 23 — Hangfire wrapper around NewsIngestionService.RunOnceAsync. Schedule:
/// 05:00 ET daily (right after NetWorthSnapshotJob completes). Per the Wave 23
/// decision matrix, 1× per day is the right cadence for a DCA-focused user — no
/// need to chase intraday news.
/// </summary>
public class NewsIngestionJob
{
    private readonly INewsIngestionService _service;
    private readonly ILogger<NewsIngestionJob> _logger;

    public NewsIngestionJob(INewsIngestionService service, ILogger<NewsIngestionJob> logger)
    {
        _service = service;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 120, 600 })]
    [Queue("news")]
    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[NewsIngestionJob] Starting daily news ingestion");
        var result = await _service.RunOnceAsync(cancellationToken);
        _logger.LogInformation(
            "[NewsIngestionJob] Completed. fetched={Fetched}, new={New}, digests={Digests}, snapshotsRebuilt={Rebuilt}, cost=${Cost:F4}, duration={Duration:F1}s",
            result.ArticlesFetched, result.ArticlesNew, result.DigestsCreated, result.SnapshotsRebuilt,
            result.TotalCostUsd, result.Duration.TotalSeconds);

        foreach (var w in result.Warnings)
        {
            _logger.LogWarning("[NewsIngestionJob] {Warning}", w);
        }
    }
}
