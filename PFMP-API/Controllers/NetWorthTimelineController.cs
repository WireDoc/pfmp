using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Controllers;

/// <summary>
/// Endpoints for net worth timeline data.
/// Wave 10: Background Jobs & Automation - Phase 3
/// </summary>
[ApiController]
[Route("api/dashboard/net-worth")]
public class NetWorthTimelineController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NetWorthTimelineController> _logger;

    public NetWorthTimelineController(
        ApplicationDbContext context,
        ILogger<NetWorthTimelineController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get net worth timeline data for charts
    /// </summary>
    /// <param name="userId">User ID (defaults to 1 in dev)</param>
    /// <param name="period">Time period: 1M, 3M, 6M, 1Y, YTD, ALL (default: 3M)</param>
    [HttpGet("timeline")]
    public async Task<ActionResult<TimelineResponse>> GetTimeline(
        [FromQuery] int? userId,
        [FromQuery] string period = "3M",
        CancellationToken ct = default)
    {
        var targetUserId = userId ?? 1;

        // Calculate date range based on period
        var (startDate, endDate) = GetDateRange(period);

        var snapshots = await _context.NetWorthSnapshots
            .Where(s => s.UserId == targetUserId)
            .Where(s => s.SnapshotDate >= startDate && s.SnapshotDate <= endDate)
            .OrderBy(s => s.SnapshotDate)
            .Select(s => new TimelineDataPoint
            {
                Date = s.SnapshotDate,
                TotalNetWorth = s.TotalNetWorth,
                Investments = s.InvestmentsTotal,
                Cash = s.CashTotal,
                RealEstate = s.RealEstateEquity,
                Retirement = s.RetirementTotal,
                Liabilities = s.LiabilitiesTotal
            })
            .ToListAsync(ct);

        // Calculate summary statistics
        var summary = CalculateSummary(snapshots);

        return Ok(new TimelineResponse
        {
            UserId = targetUserId,
            Period = period,
            StartDate = startDate,
            EndDate = endDate,
            DataPoints = snapshots.Count,
            Snapshots = snapshots,
            Summary = summary
        });
    }

    /// <summary>
    /// Get the latest net worth snapshot for a user
    /// </summary>
    [HttpGet("current")]
    public async Task<ActionResult<CurrentNetWorthResponse>> GetCurrentNetWorth(
        [FromQuery] int? userId,
        CancellationToken ct = default)
    {
        var targetUserId = userId ?? 1;

        var latest = await _context.NetWorthSnapshots
            .Where(s => s.UserId == targetUserId)
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefaultAsync(ct);

        if (latest == null)
        {
            return Ok(new CurrentNetWorthResponse
            {
                UserId = targetUserId,
                HasData = false,
                Message = "No net worth data available yet. Check back after the daily snapshot runs."
            });
        }

        // Get previous snapshot for change calculation
        var previous = await _context.NetWorthSnapshots
            .Where(s => s.UserId == targetUserId)
            .Where(s => s.SnapshotDate < latest.SnapshotDate)
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefaultAsync(ct);

        decimal change = 0;
        decimal changePercent = 0;
        if (previous != null && previous.TotalNetWorth != 0)
        {
            change = latest.TotalNetWorth - previous.TotalNetWorth;
            changePercent = (change / previous.TotalNetWorth) * 100;
        }

        return Ok(new CurrentNetWorthResponse
        {
            UserId = targetUserId,
            HasData = true,
            SnapshotDate = latest.SnapshotDate,
            TotalNetWorth = latest.TotalNetWorth,
            Investments = latest.InvestmentsTotal,
            Cash = latest.CashTotal,
            RealEstate = latest.RealEstateEquity,
            Retirement = latest.RetirementTotal,
            Liabilities = latest.LiabilitiesTotal,
            Change = change,
            ChangePercent = changePercent,
            PreviousDate = previous?.SnapshotDate
        });
    }

    /// <summary>
    /// Get sparkline data (last 30 days) for dashboard widget
    /// </summary>
    [HttpGet("sparkline")]
    public async Task<ActionResult<SparklineResponse>> GetSparkline(
        [FromQuery] int? userId,
        CancellationToken ct = default)
    {
        var targetUserId = userId ?? 1;
        var startDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var snapshots = await _context.NetWorthSnapshots
            .Where(s => s.UserId == targetUserId)
            .Where(s => s.SnapshotDate >= startDate)
            .OrderBy(s => s.SnapshotDate)
            .Select(s => new SparklinePoint
            {
                Date = s.SnapshotDate,
                Value = s.TotalNetWorth
            })
            .ToListAsync(ct);

        decimal change = 0;
        decimal changePercent = 0;
        if (snapshots.Count >= 2)
        {
            var first = snapshots.First().Value;
            var last = snapshots.Last().Value;
            if (first != 0)
            {
                change = last - first;
                changePercent = (change / first) * 100;
            }
        }

        return Ok(new SparklineResponse
        {
            UserId = targetUserId,
            DataPoints = snapshots.Count,
            MinDataPointsRequired = 3,
            HasEnoughData = snapshots.Count >= 3,
            Points = snapshots,
            Change = change,
            ChangePercent = changePercent,
            CurrentValue = snapshots.LastOrDefault()?.Value ?? 0
        });
    }

    private static (DateOnly startDate, DateOnly endDate) GetDateRange(string period)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = period.ToUpperInvariant() switch
        {
            "1M" => today.AddMonths(-1),
            "3M" => today.AddMonths(-3),
            "6M" => today.AddMonths(-6),
            "1Y" => today.AddYears(-1),
            "YTD" => new DateOnly(today.Year, 1, 1),
            "ALL" => DateOnly.MinValue,
            _ => today.AddMonths(-3) // Default to 3M
        };
        return (startDate, today);
    }

    private static TimelineSummary CalculateSummary(List<TimelineDataPoint> snapshots)
    {
        if (snapshots.Count == 0)
        {
            return new TimelineSummary();
        }

        var first = snapshots.First();
        var last = snapshots.Last();

        decimal change = last.TotalNetWorth - first.TotalNetWorth;
        decimal changePercent = first.TotalNetWorth != 0 
            ? (change / first.TotalNetWorth) * 100 
            : 0;

        return new TimelineSummary
        {
            StartValue = first.TotalNetWorth,
            EndValue = last.TotalNetWorth,
            Change = change,
            ChangePercent = changePercent,
            High = snapshots.Max(s => s.TotalNetWorth),
            Low = snapshots.Min(s => s.TotalNetWorth),
            Average = snapshots.Average(s => s.TotalNetWorth)
        };
    }
}

#region DTOs

public class TimelineResponse
{
    public int UserId { get; set; }
    public string Period { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int DataPoints { get; set; }
    public List<TimelineDataPoint> Snapshots { get; set; } = new();
    public TimelineSummary Summary { get; set; } = new();
}

public class TimelineDataPoint
{
    public DateOnly Date { get; set; }
    public decimal TotalNetWorth { get; set; }
    public decimal Investments { get; set; }
    public decimal Cash { get; set; }
    public decimal RealEstate { get; set; }
    public decimal Retirement { get; set; }
    public decimal Liabilities { get; set; }
}

public class TimelineSummary
{
    public decimal StartValue { get; set; }
    public decimal EndValue { get; set; }
    public decimal Change { get; set; }
    public decimal ChangePercent { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Average { get; set; }
}

public class CurrentNetWorthResponse
{
    public int UserId { get; set; }
    public bool HasData { get; set; }
    public string? Message { get; set; }
    public DateOnly? SnapshotDate { get; set; }
    public decimal TotalNetWorth { get; set; }
    public decimal Investments { get; set; }
    public decimal Cash { get; set; }
    public decimal RealEstate { get; set; }
    public decimal Retirement { get; set; }
    public decimal Liabilities { get; set; }
    public decimal Change { get; set; }
    public decimal ChangePercent { get; set; }
    public DateOnly? PreviousDate { get; set; }
}

public class SparklineResponse
{
    public int UserId { get; set; }
    public int DataPoints { get; set; }
    public int MinDataPointsRequired { get; set; }
    public bool HasEnoughData { get; set; }
    public List<SparklinePoint> Points { get; set; } = new();
    public decimal Change { get; set; }
    public decimal ChangePercent { get; set; }
    public decimal CurrentValue { get; set; }
}

public class SparklinePoint
{
    public DateOnly Date { get; set; }
    public decimal Value { get; set; }
}

#endregion
