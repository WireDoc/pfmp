using Hangfire;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Services.Properties;

namespace PFMP_API.Jobs;

/// <summary>
/// Monthly background job to refresh property valuations for all users.
/// Wave 15 — runs on the 1st of each month at 3 AM ET.
/// </summary>
public class PropertyValuationRefreshJob
{
    private readonly ApplicationDbContext _context;
    private readonly IPropertyValuationService _valuationService;
    private readonly ILogger<PropertyValuationRefreshJob> _logger;

    public PropertyValuationRefreshJob(
        ApplicationDbContext context,
        IPropertyValuationService valuationService,
        ILogger<PropertyValuationRefreshJob> logger)
    {
        _context = context;
        _valuationService = valuationService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1, DelaysInSeconds = new[] { 600 })]
    [Queue("default")]
    public async Task RefreshAllPropertyValuationsAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting monthly property valuation refresh job");

        var userIds = await _context.Properties
            .Where(p => p.AutoValuationEnabled)
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        int totalRefreshed = 0;
        foreach (var userId in userIds)
        {
            if (cancellationToken.IsCancellationRequested) break;

            try
            {
                var count = await _valuationService.RefreshAllPropertyValuationsAsync(userId);
                totalRefreshed += count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Property valuation refresh failed for user {UserId}", userId);
            }
        }

        _logger.LogInformation(
            "Monthly property valuation refresh complete: {Refreshed} properties across {Users} users",
            totalRefreshed, userIds.Count);
    }
}
