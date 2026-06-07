using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Spending;
using PFMP_API.Services.Plaid;
using PFMP_API.Services.Spending;

namespace PFMP_API.Controllers;

/// <summary>
/// Wave 14 P1: spending analysis + cash-flow reconciliation endpoints.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SpendingController : ControllerBase
{
    private static readonly ConcurrentDictionary<int, DateTime> _lastRecomputeByUser = new();

    private readonly ISpendingAnalyticsService _analytics;
    private readonly ICashFlowSummaryService _cashFlow;
    private readonly IBudgetService _budgets;
    private readonly ICategoryRuleService _rules;
    private readonly IHeuristicRecurringDetector _heuristic;
    private readonly IAnomalyDetectionService _anomalies;
    private readonly ISpendingAlertService _spendingAlerts;
    private readonly IPlaidService _plaid;
    private readonly ApplicationDbContext _db;
    private readonly SpendingOptions _options;
    private readonly ILogger<SpendingController> _logger;

    public SpendingController(
        ISpendingAnalyticsService analytics,
        ICashFlowSummaryService cashFlow,
        IBudgetService budgets,
        ICategoryRuleService rules,
        IHeuristicRecurringDetector heuristic,
        IAnomalyDetectionService anomalies,
        ISpendingAlertService spendingAlerts,
        IPlaidService plaid,
        ApplicationDbContext db,
        IOptions<SpendingOptions> options,
        ILogger<SpendingController> logger)
    {
        _analytics = analytics;
        _cashFlow = cashFlow;
        _budgets = budgets;
        _rules = rules;
        _heuristic = heuristic;
        _anomalies = anomalies;
        _spendingAlerts = spendingAlerts;
        _plaid = plaid;
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    // ----- Summary / By-category / Top merchants / Transactions -----

    [HttpGet("summary")]
    public async Task<ActionResult<MonthlySummary>> GetSummary(
        [FromQuery, Required] int userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (f, t) = ResolveWindow(from, to);
        return Ok(await _analytics.GetMonthlySummaryAsync(userId, f, t, ct));
    }

    [HttpGet("cash-flow-summary")]
    public async Task<ActionResult<CashFlowSummary>> GetCashFlowSummary(
        [FromQuery, Required] int userId,
        CancellationToken ct)
    {
        return Ok(await _cashFlow.GetAsync(userId, ct));
    }

    [HttpGet("by-category")]
    public async Task<ActionResult<IReadOnlyList<CategoryRollup>>> GetByCategory(
        [FromQuery, Required] int userId,
        [FromQuery] DateTime? periodStart,
        [FromQuery] DateTime? periodEnd,
        CancellationToken ct)
    {
        var (s, e) = ResolveWindow(periodStart, periodEnd);
        return Ok(await _analytics.GetByCategoryAsync(userId, s, e, ct));
    }

    [HttpGet("top-merchants")]
    public async Task<ActionResult<IReadOnlyList<MerchantAggregate>>> GetTopMerchants(
        [FromQuery, Required] int userId,
        [FromQuery] int limit = 10,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        var (f, t) = ResolveWindow(from, to);
        return Ok(await _analytics.GetTopMerchantsAsync(userId, Math.Clamp(limit, 1, 100), f, t, ct));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery, Required] int userId,
        [FromQuery] string? category,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (f, t) = ResolveWindow(from, to);
        var txs = await _analytics.GetTransactionsAsync(userId, category, f, t, ct);
        return Ok(txs);
    }

    // ----- Budgets -----

    [HttpGet("budgets")]
    public async Task<ActionResult<IReadOnlyList<ExpenseBudget>>> GetBudgets(
        [FromQuery, Required] int userId,
        [FromQuery] DateTime? asOf,
        CancellationToken ct)
    {
        if (asOf.HasValue)
            return Ok(await _budgets.EffectiveAsOfAsync(userId, asOf.Value, ct));
        return Ok(await _budgets.ListAsync(userId, ct));
    }

    [HttpPost("budgets")]
    public async Task<ActionResult<ExpenseBudget>> CreateBudget([FromBody] ExpenseBudget budget, CancellationToken ct)
    {
        var created = await _budgets.CreateAsync(budget, ct);
        return CreatedAtAction(nameof(GetBudgets), new { userId = budget.UserId }, created);
    }

    [HttpPut("budgets/{id:int}")]
    public async Task<ActionResult<ExpenseBudget>> UpdateBudget(int id, [FromBody] ExpenseBudget patch, CancellationToken ct)
    {
        var updated = await _budgets.UpdateAsync(id, patch, ct);
        if (updated is null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("budgets/{id:int}")]
    public async Task<IActionResult> DeleteBudget(int id, CancellationToken ct)
    {
        var deleted = await _budgets.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    // ----- Rules -----

    [HttpGet("rules")]
    public async Task<ActionResult<IReadOnlyList<SpendingCategoryRule>>> GetRules(
        [FromQuery, Required] int userId,
        CancellationToken ct)
    {
        return Ok(await _rules.ListAsync(userId, ct));
    }

    [HttpPost("rules")]
    public async Task<ActionResult<SpendingCategoryRule>> CreateRule([FromBody] SpendingCategoryRule rule, CancellationToken ct)
    {
        var created = await _rules.CreateAsync(rule, ct);
        return CreatedAtAction(nameof(GetRules), new { userId = rule.UserId }, created);
    }

    [HttpPut("rules/{id:int}")]
    public async Task<ActionResult<SpendingCategoryRule>> UpdateRule(int id, [FromBody] SpendingCategoryRule patch, CancellationToken ct)
    {
        var updated = await _rules.UpdateAsync(id, patch, ct);
        if (updated is null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("rules/{id:int}")]
    public async Task<IActionResult> DeleteRule(int id, CancellationToken ct)
    {
        var deleted = await _rules.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    // ----- Recompute (rate-limited) -----

    [HttpPost("recompute")]
    public async Task<IActionResult> Recompute([FromQuery, Required] int userId, CancellationToken ct)
    {
        var window = TimeSpan.FromMinutes(_options.RecomputeRateLimitMinutes);
        if (_lastRecomputeByUser.TryGetValue(userId, out var last))
        {
            var elapsed = DateTime.UtcNow - last;
            if (elapsed < window)
            {
                var retry = (int)Math.Ceiling((window - elapsed).TotalSeconds);
                Response.Headers["Retry-After"] = retry.ToString();
                return StatusCode(429, new { message = $"Recompute available again in {retry} seconds." });
            }
        }
        await _analytics.RecomputeRollupsAsync(userId, monthsBack: 12, ct);
        // P3: refresh recurring streams + anomalies + alerts on the same pass so
        // manual recompute matches the nightly SpendingRollupJob behavior.
        await _heuristic.DetectAsync(userId, ct);
        await _anomalies.DetectAsync(userId, ct);
        await _spendingAlerts.GenerateAnomalyAlertsAsync(userId, ct);
        _lastRecomputeByUser[userId] = DateTime.UtcNow;
        return Ok(new { recomputed = true, asOf = DateTime.UtcNow });
    }

    // ----- P3: Recurring streams -----

    [HttpGet("recurring")]
    public async Task<ActionResult<IReadOnlyList<RecurringTransactionStream>>> GetRecurring(
        [FromQuery, Required] int userId,
        [FromQuery] string? direction,
        [FromQuery] bool? isActive,
        CancellationToken ct)
    {
        var q = _db.RecurringTransactionStreams.AsNoTracking().Where(r => r.UserId == userId);
        if (!string.IsNullOrWhiteSpace(direction)
            && Enum.TryParse<RecurringStreamDirection>(direction, ignoreCase: true, out var dir))
        {
            q = q.Where(r => r.Direction == dir);
        }
        if (isActive.HasValue)
        {
            q = q.Where(r => r.IsActive == isActive.Value);
        }
        var rows = await q.OrderByDescending(r => r.LastDate).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("recurring/sync")]
    public async Task<IActionResult> SyncRecurring([FromQuery, Required] Guid connectionId)
    {
        var result = await _plaid.SyncRecurringStreamsAsync(connectionId);
        if (!result.Success) return StatusCode(502, new { error = result.ErrorMessage });
        return Ok(new
        {
            added = result.StreamsAdded,
            updated = result.StreamsUpdated,
            tombstoned = result.StreamsTombstoned,
            durationMs = result.DurationMs,
        });
    }

    [HttpPost("recurring/{id:int}/dismiss")]
    public async Task<IActionResult> DismissRecurring(int id, CancellationToken ct)
    {
        var row = await _db.RecurringTransactionStreams.FirstOrDefaultAsync(r => r.StreamId == id, ct);
        if (row is null) return NotFound();
        row.IsActive = false;
        row.Status = RecurringStreamStatus.Tombstoned;
        row.DateUpdated = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ----- P3: Anomalies -----

    [HttpGet("anomalies")]
    public async Task<ActionResult<IReadOnlyList<SpendingAnomaly>>> GetAnomalies(
        [FromQuery, Required] int userId,
        [FromQuery] bool? dismissed,
        CancellationToken ct)
    {
        var q = _db.SpendingAnomalies.AsNoTracking().Where(a => a.UserId == userId);
        if (dismissed.HasValue) q = q.Where(a => a.Dismissed == dismissed.Value);
        var rows = await q.OrderByDescending(a => a.DetectedAt).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("anomalies/{id:int}/dismiss")]
    public async Task<IActionResult> DismissAnomaly(int id, CancellationToken ct)
    {
        var row = await _db.SpendingAnomalies.FirstOrDefaultAsync(a => a.AnomalyId == id, ct);
        if (row is null) return NotFound();
        row.Dismissed = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static (DateTime from, DateTime to) ResolveWindow(DateTime? from, DateTime? to)
    {
        var anchor = to ?? DateTime.UtcNow;
        if (anchor.Kind == DateTimeKind.Unspecified) anchor = DateTime.SpecifyKind(anchor, DateTimeKind.Utc);
        var start = from ?? new DateTime(anchor.Year, anchor.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-1);
        if (start.Kind == DateTimeKind.Unspecified) start = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        return (start, anchor);
    }
}
