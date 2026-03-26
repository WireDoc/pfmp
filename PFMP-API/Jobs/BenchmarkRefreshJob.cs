using Hangfire;

namespace PFMP_API.Jobs;

public class BenchmarkRefreshJob
{
    private readonly Services.BenchmarkDataService _benchmarkService;
    private readonly ILogger<BenchmarkRefreshJob> _logger;

    public BenchmarkRefreshJob(
        Services.BenchmarkDataService benchmarkService,
        ILogger<BenchmarkRefreshJob> logger)
    {
        _benchmarkService = benchmarkService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
    public async Task RefreshBenchmarkDataAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting daily benchmark data refresh");
        await _benchmarkService.RefreshBenchmarkDataAsync();
        _logger.LogInformation("Completed daily benchmark data refresh");
    }
}
