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
    private readonly IPropertyValuationProvider _valuationProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PropertyValuationRefreshJob> _logger;

    public PropertyValuationRefreshJob(
        ApplicationDbContext context,
        IPropertyValuationService valuationService,
        IPropertyValuationProvider valuationProvider,
        IConfiguration configuration,
        ILogger<PropertyValuationRefreshJob> logger)
    {
        _context = context;
        _valuationService = valuationService;
        _valuationProvider = valuationProvider;
        _configuration = configuration;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 1, DelaysInSeconds = new[] { 600 })]
    [Queue("default")]
    public async Task RefreshAllPropertyValuationsAsync(CancellationToken cancellationToken = default)
    {
        // Kill switch / config gate — covers both "no API key" and explicit disable.
        if (!_valuationProvider.IsConfigured)
        {
            _logger.LogWarning(
                "Skipping monthly property valuation refresh: provider {Provider} is not configured or is disabled. " +
                "Check PropertyValuation:RentCastApiKey and PropertyValuation:RentCastEnabled.",
                _valuationProvider.ProviderName);
            return;
        }

        var candidateCount = await _context.Properties
            .CountAsync(p => p.AutoValuationEnabled, cancellationToken);

        // Sanity cap — protects against runaway test data filling pfmp_dev.
        // Free-tier RentCast = 50 calls/month; threshold default 50, override via PropertyValuation:MaxMonthlyValuationCalls.
        var maxCalls = _configuration.GetValue<int?>("PropertyValuation:MaxMonthlyValuationCalls") ?? 50;
        if (candidateCount > maxCalls)
        {
            _logger.LogError(
                "ABORTING monthly property valuation refresh: {Count} candidate properties exceeds safety cap of {Max}. " +
                "This usually indicates leaked integration-test fixtures in the database. " +
                "Investigate and clean up before re-running. Override with PropertyValuation:MaxMonthlyValuationCalls if intentional.",
                candidateCount, maxCalls);
            return;
        }

        _logger.LogInformation(
            "Starting monthly property valuation refresh job ({Count} candidate properties, cap {Max})",
            candidateCount, maxCalls);

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
