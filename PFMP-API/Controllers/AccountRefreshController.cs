using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Jobs;

namespace PFMP_API.Controllers;

/// <summary>
/// Endpoints for manually triggering account refresh operations.
/// Wave 10: Background Jobs & Automation
/// </summary>
[ApiController]
[Route("api/accounts")]
public class AccountRefreshController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly PriceRefreshJob _priceRefreshJob;
    private readonly NetWorthSnapshotJob _netWorthSnapshotJob;
    private readonly ILogger<AccountRefreshController> _logger;

    public AccountRefreshController(
        ApplicationDbContext context,
        PriceRefreshJob priceRefreshJob,
        NetWorthSnapshotJob netWorthSnapshotJob,
        ILogger<AccountRefreshController> logger)
    {
        _context = context;
        _priceRefreshJob = priceRefreshJob;
        _netWorthSnapshotJob = netWorthSnapshotJob;
        _logger = logger;
    }

    /// <summary>
    /// Refresh prices for a single account
    /// </summary>
    [HttpPost("{accountId:int}/refresh")]
    public async Task<ActionResult<RefreshResult>> RefreshAccount(int accountId, CancellationToken ct)
    {
        var account = await _context.Accounts
            .Include(a => a.Holdings)
            .FirstOrDefaultAsync(a => a.AccountId == accountId, ct);

        if (account == null)
        {
            return NotFound(new { error = "Account not found" });
        }

        var startTime = DateTime.UtcNow;
        
        try
        {
            await _priceRefreshJob.RefreshAccountPricesAsync(accountId, ct);
            
            return Ok(new RefreshResult
            {
                Success = true,
                AccountId = accountId,
                HoldingsUpdated = account.Holdings.Count,
                RefreshedAt = DateTime.UtcNow,
                DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh account {AccountId}", accountId);
            return StatusCode(500, new RefreshResult
            {
                Success = false,
                AccountId = accountId,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Refresh prices for all accounts belonging to a user
    /// </summary>
    [HttpPost("refresh-all")]
    public async Task<ActionResult<RefreshAllResult>> RefreshAllAccounts([FromQuery] int? userId, CancellationToken ct)
    {
        // If no userId specified, use dev default
        var targetUserId = userId ?? 1;

        var accounts = await _context.Accounts
            .Where(a => a.UserId == targetUserId)
            .Where(a => a.IsBackgroundRefreshEnabled)
            .Where(a => a.LifecycleState == "Active")
            .Select(a => a.AccountId)
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            return Ok(new RefreshAllResult
            {
                Success = true,
                UserId = targetUserId,
                AccountsRefreshed = 0,
                Message = "No eligible accounts found"
            });
        }

        var startTime = DateTime.UtcNow;
        int refreshed = 0;
        var errors = new List<string>();

        foreach (var accountId in accounts)
        {
            try
            {
                await _priceRefreshJob.RefreshAccountPricesAsync(accountId, ct);
                refreshed++;
            }
            catch (Exception ex)
            {
                errors.Add($"Account {accountId}: {ex.Message}");
            }
        }

        return Ok(new RefreshAllResult
        {
            Success = errors.Count == 0,
            UserId = targetUserId,
            AccountsRefreshed = refreshed,
            Errors = errors.Count > 0 ? errors : null,
            RefreshedAt = DateTime.UtcNow,
            DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds
        });
    }

    /// <summary>
    /// Trigger an immediate net worth snapshot for a user
    /// </summary>
    [HttpPost("snapshot")]
    public async Task<ActionResult<SnapshotResult>> TriggerSnapshot([FromQuery] int? userId, CancellationToken ct)
    {
        var targetUserId = userId ?? 1;

        var user = await _context.Users.FindAsync(new object[] { targetUserId }, ct);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        try
        {
            await _netWorthSnapshotJob.CaptureSnapshotForUserAsync(targetUserId, ct);

            var snapshot = await _context.NetWorthSnapshots
                .Where(s => s.UserId == targetUserId)
                .OrderByDescending(s => s.SnapshotDate)
                .FirstOrDefaultAsync(ct);

            return Ok(new SnapshotResult
            {
                Success = true,
                UserId = targetUserId,
                SnapshotDate = snapshot?.SnapshotDate,
                TotalNetWorth = snapshot?.TotalNetWorth,
                CreatedAt = snapshot?.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to capture snapshot for user {UserId}", targetUserId);
            return StatusCode(500, new SnapshotResult
            {
                Success = false,
                UserId = targetUserId,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Queue a background price refresh for all holdings (async)
    /// </summary>
    [HttpPost("refresh-all/async")]
    public ActionResult<BackgroundJobResult> QueueRefreshAll()
    {
        var jobId = BackgroundJob.Enqueue<PriceRefreshJob>(
            job => job.RefreshAllHoldingPricesAsync(CancellationToken.None));

        return Accepted(new BackgroundJobResult
        {
            JobId = jobId,
            Status = "Queued",
            Message = "Price refresh job queued for background processing"
        });
    }

    /// <summary>
    /// Queue a background net worth snapshot for all users (async)
    /// </summary>
    [HttpPost("snapshot-all/async")]
    public ActionResult<BackgroundJobResult> QueueSnapshotAll()
    {
        var jobId = BackgroundJob.Enqueue<NetWorthSnapshotJob>(
            job => job.CaptureAllUserSnapshotsAsync(CancellationToken.None));

        return Accepted(new BackgroundJobResult
        {
            JobId = jobId,
            Status = "Queued",
            Message = "Net worth snapshot job queued for background processing"
        });
    }
}

public class RefreshResult
{
    public bool Success { get; set; }
    public int AccountId { get; set; }
    public int HoldingsUpdated { get; set; }
    public DateTime? RefreshedAt { get; set; }
    public int DurationMs { get; set; }
    public string? Error { get; set; }
}

public class RefreshAllResult
{
    public bool Success { get; set; }
    public int UserId { get; set; }
    public int AccountsRefreshed { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }
    public DateTime? RefreshedAt { get; set; }
    public int DurationMs { get; set; }
}

public class SnapshotResult
{
    public bool Success { get; set; }
    public int UserId { get; set; }
    public DateOnly? SnapshotDate { get; set; }
    public decimal? TotalNetWorth { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string? Error { get; set; }
}

public class BackgroundJobResult
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
