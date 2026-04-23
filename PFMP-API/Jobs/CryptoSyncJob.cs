using Hangfire;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Crypto;
using PFMP_API.Services.Crypto;

namespace PFMP_API.Jobs
{
    /// <summary>
    /// Wave 13: Daily background sync of all active crypto exchange connections.
    /// Schedule: 11:45 PM ET (after PriceRefreshJob and NetWorthSnapshotJob).
    /// </summary>
    public class CryptoSyncJob
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CryptoSyncJob> _logger;

        public CryptoSyncJob(IServiceProvider serviceProvider, ILogger<CryptoSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
        public async Task SyncAllConnectionsAsync(CancellationToken cancellationToken = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var connectionService = scope.ServiceProvider.GetRequiredService<IExchangeConnectionService>();

            var ids = await db.ExchangeConnections
                .Where(c => c.Status == ExchangeConnectionStatus.Active || c.Status == ExchangeConnectionStatus.Error)
                .Select(c => c.ExchangeConnectionId)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("CryptoSyncJob starting for {Count} connection(s)", ids.Count);
            int success = 0, failure = 0;
            foreach (var id in ids)
            {
                try
                {
                    var result = await connectionService.SyncConnectionAsync(id, cancellationToken);
                    if (result.Error is null)
                    {
                        success++;
                        _logger.LogDebug("CryptoSyncJob synced {Id}: {Holdings} holdings, +{Inserted} tx (skipped {Skipped})",
                            id, result.HoldingsUpserted, result.TransactionsInserted, result.TransactionsSkipped);
                    }
                    else
                    {
                        failure++;
                        _logger.LogWarning("CryptoSyncJob {Id} returned error: {Error}", id, result.Error);
                    }
                }
                catch (Exception ex)
                {
                    failure++;
                    _logger.LogError(ex, "CryptoSyncJob {Id} threw", id);
                }
            }
            _logger.LogInformation("CryptoSyncJob complete: {Success} ok, {Failure} failed", success, failure);
        }
    }
}
