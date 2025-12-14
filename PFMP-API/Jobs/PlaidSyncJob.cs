using Hangfire;
using PFMP_API.Services.Plaid;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Jobs
{
    /// <summary>
    /// Hangfire background job for syncing Plaid account balances and investments.
    /// Scheduled to run daily at 10 PM ET to capture end-of-day balances.
    /// </summary>
    public class PlaidSyncJob
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PlaidSyncJob> _logger;

        public PlaidSyncJob(IServiceProvider serviceProvider, ILogger<PlaidSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        /// <summary>
        /// Syncs all active Plaid connections across all users.
        /// This is the main entry point for scheduled syncing.
        /// </summary>
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })] // 1 min, 5 min, 15 min
        public async Task SyncAllConnections()
        {
            _logger.LogInformation("Starting Plaid sync job for all connections");
            var startTime = DateTime.UtcNow;

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var plaidService = scope.ServiceProvider.GetRequiredService<IPlaidService>();
            var investmentsService = scope.ServiceProvider.GetRequiredService<IPlaidInvestmentsService>();

            // Get all active connections
            var connections = await db.AccountConnections
                .Where(c => c.Status == SyncStatus.Connected)
                .ToListAsync();

            _logger.LogInformation("Found {Count} active Plaid connections to sync", connections.Count);

            int successCount = 0;
            int failureCount = 0;
            int investmentSuccessCount = 0;
            int investmentFailureCount = 0;

            foreach (var connection in connections)
            {
                try
                {
                    // Check if this is an investment connection based on AccountSource
                    bool isInvestmentConnection = connection.Source == AccountSource.PlaidInvestments;

                    if (isInvestmentConnection)
                    {
                        // Sync investment holdings
                        var holdingsResult = await investmentsService.SyncInvestmentHoldingsAsync(connection.ConnectionId);
                        if (holdingsResult.Success)
                        {
                            investmentSuccessCount++;
                            _logger.LogDebug("Successfully synced investment holdings for {ConnectionId}: {AccountCount} accounts, {HoldingsCount} holdings",
                                connection.ConnectionId, holdingsResult.AccountsUpdated, holdingsResult.HoldingsUpdated);

                            // Also sync investment transactions
                            var txnResult = await investmentsService.SyncInvestmentTransactionsAsync(connection.ConnectionId);
                            if (txnResult.Success)
                            {
                                _logger.LogDebug("Synced investment transactions for {ConnectionId}: +{Created} ~{Updated} ({Total} total)",
                                    connection.ConnectionId, txnResult.TransactionsCreated, 
                                    txnResult.TransactionsUpdated, txnResult.TransactionsTotal);
                            }
                            else
                            {
                                _logger.LogWarning("Investment transaction sync failed for {ConnectionId}: {Error}",
                                    connection.ConnectionId, txnResult.ErrorMessage);
                            }
                        }
                        else
                        {
                            investmentFailureCount++;
                            _logger.LogWarning("Investment sync failed for connection {ConnectionId}: {Error}",
                                connection.ConnectionId, holdingsResult.ErrorMessage);
                        }
                    }
                    else
                    {
                        // Sync cash account balances
                        var result = await plaidService.SyncConnectionAsync(connection.ConnectionId);
                        if (result.Success)
                        {
                            successCount++;
                            _logger.LogDebug("Successfully synced connection {ConnectionId}: {AccountCount} accounts updated",
                                connection.ConnectionId, result.AccountsUpdated);

                            // Also sync cash transactions
                            var txnResult = await plaidService.SyncTransactionsAsync(connection.ConnectionId);
                            if (txnResult.Success)
                            {
                                _logger.LogDebug("Synced transactions for {ConnectionId}: +{Added} ~{Modified} -{Removed}",
                                    connection.ConnectionId, txnResult.TransactionsAdded, 
                                    txnResult.TransactionsModified, txnResult.TransactionsRemoved);
                            }
                            else
                            {
                                _logger.LogWarning("Transaction sync failed for {ConnectionId}: {Error}",
                                    connection.ConnectionId, txnResult.ErrorMessage);
                            }
                        }
                        else
                        {
                            failureCount++;
                            _logger.LogWarning("Sync failed for connection {ConnectionId}: {Error}",
                                connection.ConnectionId, result.ErrorMessage);
                        }
                    }
                }
                catch (Exception ex)
                {
                    failureCount++;
                    _logger.LogError(ex, "Exception syncing connection {ConnectionId}", connection.ConnectionId);
                }
            }

            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Plaid sync job completed in {Duration}ms. Cash: {CashSuccess}/{CashFailed}, Investments: {InvSuccess}/{InvFailed}",
                duration.TotalMilliseconds, successCount, failureCount, investmentSuccessCount, investmentFailureCount);
        }

        /// <summary>
        /// Syncs a single connection. Called from the API for manual sync operations.
        /// </summary>
        [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 30, 120 })]
        public async Task SyncSingleConnection(Guid connectionId)
        {
            _logger.LogInformation("Starting Plaid sync job for connection {ConnectionId}", connectionId);

            using var scope = _serviceProvider.CreateScope();
            var plaidService = scope.ServiceProvider.GetRequiredService<IPlaidService>();

            var result = await plaidService.SyncConnectionAsync(connectionId);

            if (result.Success)
            {
                _logger.LogInformation("Successfully synced connection {ConnectionId}: {AccountCount} accounts updated",
                    connectionId, result.AccountsUpdated);
            }
            else
            {
                _logger.LogError("Failed to sync connection {ConnectionId}: {Error}",
                    connectionId, result.ErrorMessage);
                throw new Exception($"Sync failed: {result.ErrorMessage}");
            }
        }

        /// <summary>
        /// Syncs all connections for a specific user.
        /// </summary>
        [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 30, 120 })]
        public async Task SyncUserConnections(int userId)
        {
            _logger.LogInformation("Starting Plaid sync job for user {UserId}", userId);

            using var scope = _serviceProvider.CreateScope();
            var plaidService = scope.ServiceProvider.GetRequiredService<IPlaidService>();

            var result = await plaidService.SyncAllUserConnectionsAsync(userId);

            if (result.Success)
            {
                _logger.LogInformation("Successfully synced all connections for user {UserId}: {AccountCount} accounts updated",
                    userId, result.AccountsUpdated);
            }
            else
            {
                _logger.LogWarning("Some connections failed to sync for user {UserId}: {Error}",
                    userId, result.ErrorMessage);
            }
        }

        /// <summary>
        /// Registers recurring Hangfire jobs for Plaid syncing.
        /// Called during application startup.
        /// </summary>
        public static void RegisterRecurringJobs()
        {
            // Schedule daily sync at 10 PM Eastern Time (3 AM UTC during EST, 2 AM UTC during EDT)
            // Using IANA timezone identifier for better cross-platform compatibility
            var easternTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
            
            RecurringJob.AddOrUpdate<PlaidSyncJob>(
                "plaid-daily-sync",
                job => job.SyncAllConnections(),
                "0 22 * * *", // 10 PM every day
                new RecurringJobOptions 
                { 
                    TimeZone = easternTimeZone 
                });
        }
    }
}
