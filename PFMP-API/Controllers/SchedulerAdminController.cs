using Hangfire;
using Hangfire.Storage;
using Hangfire.Storage.Monitoring;
using Microsoft.AspNetCore.Mvc;
using PFMP_API.Jobs;

namespace PFMP_API.Controllers;

/// <summary>
/// Admin endpoints for managing Hangfire scheduled jobs.
/// Wave 10: Background Jobs & Automation - Phase 4
/// </summary>
[ApiController]
[Route("api/admin/scheduler")]
public class SchedulerAdminController : ControllerBase
{
    private readonly IRecurringJobManager _recurringJobManager;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<SchedulerAdminController> _logger;

    public SchedulerAdminController(
        IRecurringJobManager recurringJobManager,
        IBackgroundJobClient backgroundJobClient,
        ILogger<SchedulerAdminController> logger)
    {
        _recurringJobManager = recurringJobManager;
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    /// <summary>
    /// Get list of all recurring jobs with their status
    /// </summary>
    [HttpGet("jobs")]
    public ActionResult<SchedulerJobsResponse> GetJobs()
    {
        using var connection = JobStorage.Current.GetConnection();
        var recurringJobs = connection.GetRecurringJobs();

        var jobs = recurringJobs.Select(job => new RecurringJobInfo
        {
            Id = job.Id,
            Cron = job.Cron,
            Queue = job.Queue ?? "default",
            NextExecution = job.NextExecution,
            LastExecution = job.LastExecution,
            LastJobId = job.LastJobId,
            LastJobState = job.LastJobState,
            CreatedAt = job.CreatedAt,
            TimeZoneId = "America/New_York", // Jobs are scheduled in ET
            RetryCount = job.RetryAttempt
        }).ToList();

        return Ok(new SchedulerJobsResponse
        {
            Jobs = jobs,
            TotalCount = jobs.Count,
            RetrievedAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Get queue statistics
    /// </summary>
    [HttpGet("queues")]
    public ActionResult<QueueStatsResponse> GetQueueStats()
    {
        var monitor = JobStorage.Current.GetMonitoringApi();
        var stats = monitor.GetStatistics();
        var queues = monitor.Queues();

        var queueDetails = queues.Select(q => new QueueInfo
        {
            Name = q.Name,
            Length = q.Length,
            Fetched = q.Fetched ?? 0
        }).ToList();

        return Ok(new QueueStatsResponse
        {
            Queues = queueDetails,
            Statistics = new JobStatistics
            {
                Servers = stats.Servers,
                Recurring = stats.Recurring,
                Enqueued = stats.Enqueued,
                Scheduled = stats.Scheduled,
                Processing = stats.Processing,
                Succeeded = stats.Succeeded,
                Failed = stats.Failed,
                Deleted = stats.Deleted
            },
            RetrievedAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Trigger a recurring job to run immediately
    /// </summary>
    [HttpPost("jobs/{jobId}/trigger")]
    public ActionResult<TriggerJobResponse> TriggerJob(string jobId)
    {
        try
        {
            RecurringJob.TriggerJob(jobId);
            _logger.LogInformation("Manually triggered recurring job: {JobId}", jobId);

            return Ok(new TriggerJobResponse
            {
                Success = true,
                JobId = jobId,
                Message = $"Job '{jobId}' has been queued for immediate execution",
                TriggeredAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to trigger job: {JobId}", jobId);
            return BadRequest(new TriggerJobResponse
            {
                Success = false,
                JobId = jobId,
                Message = $"Failed to trigger job: {ex.Message}",
                TriggeredAt = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Trigger price refresh job for all users
    /// </summary>
    [HttpPost("trigger/price-refresh")]
    public ActionResult<TriggerJobResponse> TriggerPriceRefresh()
    {
        var jobId = _backgroundJobClient.Enqueue<PriceRefreshJob>(job => job.RefreshAllHoldingPricesAsync(CancellationToken.None));
        _logger.LogInformation("Manually triggered price refresh job: {BackgroundJobId}", jobId);

        return Ok(new TriggerJobResponse
        {
            Success = true,
            JobId = jobId,
            Message = "Price refresh job has been queued",
            TriggeredAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Trigger net worth snapshot job for all users
    /// </summary>
    [HttpPost("trigger/networth-snapshot")]
    public ActionResult<TriggerJobResponse> TriggerNetWorthSnapshot()
    {
        var jobId = _backgroundJobClient.Enqueue<NetWorthSnapshotJob>(job => job.CaptureAllUserSnapshotsAsync(CancellationToken.None));
        _logger.LogInformation("Manually triggered net worth snapshot job: {BackgroundJobId}", jobId);

        return Ok(new TriggerJobResponse
        {
            Success = true,
            JobId = jobId,
            Message = "Net worth snapshot job has been queued",
            TriggeredAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Get recent job history (succeeded and failed)
    /// </summary>
    [HttpGet("history")]
    public ActionResult<JobHistoryResponse> GetJobHistory([FromQuery] int limit = 20)
    {
        var monitor = JobStorage.Current.GetMonitoringApi();
        
        var succeeded = monitor.SucceededJobs(0, Math.Min(limit, 50))
            .Select(j => new JobHistoryItem
            {
                JobId = j.Key,
                State = "Succeeded",
                JobName = j.Value.Job?.Type?.Name ?? "Unknown",
                SucceededAt = j.Value.SucceededAt,
                Duration = j.Value.TotalDuration.HasValue ? TimeSpan.FromMilliseconds(j.Value.TotalDuration.Value) : null
            }).ToList();

        var failed = monitor.FailedJobs(0, Math.Min(limit, 50))
            .Select(j => new JobHistoryItem
            {
                JobId = j.Key,
                State = "Failed",
                JobName = j.Value.Job?.Type?.Name ?? "Unknown",
                FailedAt = j.Value.FailedAt,
                ExceptionMessage = j.Value.ExceptionMessage,
                ExceptionType = j.Value.ExceptionType
            }).ToList();

        var processing = monitor.ProcessingJobs(0, 10)
            .Select(j => new JobHistoryItem
            {
                JobId = j.Key,
                State = "Processing",
                JobName = j.Value.Job?.Type?.Name ?? "Unknown",
                StartedAt = j.Value.StartedAt,
                ServerId = j.Value.ServerId
            }).ToList();

        return Ok(new JobHistoryResponse
        {
            Succeeded = succeeded,
            Failed = failed,
            Processing = processing,
            RetrievedAt = DateTime.UtcNow
        });
    }
}

#region Response DTOs

public record SchedulerJobsResponse
{
    public List<RecurringJobInfo> Jobs { get; init; } = new();
    public int TotalCount { get; init; }
    public DateTime RetrievedAt { get; init; }
}

public record RecurringJobInfo
{
    public string Id { get; init; } = "";
    public string Cron { get; init; } = "";
    public string Queue { get; init; } = "";
    public DateTime? NextExecution { get; init; }
    public DateTime? LastExecution { get; init; }
    public string? LastJobId { get; init; }
    public string? LastJobState { get; init; }
    public DateTime? CreatedAt { get; init; }
    public string TimeZoneId { get; init; } = "";
    public int RetryCount { get; init; }
}

public record QueueStatsResponse
{
    public List<QueueInfo> Queues { get; init; } = new();
    public JobStatistics Statistics { get; init; } = new();
    public DateTime RetrievedAt { get; init; }
}

public record QueueInfo
{
    public string Name { get; init; } = "";
    public long Length { get; init; }
    public long Fetched { get; init; }
}

public record JobStatistics
{
    public long Servers { get; init; }
    public long Recurring { get; init; }
    public long Enqueued { get; init; }
    public long Scheduled { get; init; }
    public long Processing { get; init; }
    public long Succeeded { get; init; }
    public long Failed { get; init; }
    public long Deleted { get; init; }
}

public record TriggerJobResponse
{
    public bool Success { get; init; }
    public string JobId { get; init; } = "";
    public string Message { get; init; } = "";
    public DateTime TriggeredAt { get; init; }
}

public record JobHistoryResponse
{
    public List<JobHistoryItem> Succeeded { get; init; } = new();
    public List<JobHistoryItem> Failed { get; init; } = new();
    public List<JobHistoryItem> Processing { get; init; } = new();
    public DateTime RetrievedAt { get; init; }
}

public record JobHistoryItem
{
    public string JobId { get; init; } = "";
    public string State { get; init; } = "";
    public string JobName { get; init; } = "";
    public DateTime? SucceededAt { get; init; }
    public DateTime? FailedAt { get; init; }
    public DateTime? StartedAt { get; init; }
    public TimeSpan? Duration { get; init; }
    public string? ExceptionMessage { get; init; }
    public string? ExceptionType { get; init; }
    public string? ServerId { get; init; }
}

#endregion
