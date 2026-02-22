using Going.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Item;
using Going.Plaid.Link;
using Going.Plaid.Accounts;
using Going.Plaid.Transactions;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Services.Plaid
{
    /// <summary>
    /// Configuration options for Plaid API.
    /// </summary>
    public class PlaidOptions
    {
        public string ClientId { get; set; } = string.Empty;
        public string Secret { get; set; } = string.Empty;
        public string Environment { get; set; } = "sandbox";
    }

    /// <summary>
    /// Result of a sync operation.
    /// </summary>
    public class SyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int AccountsUpdated { get; set; }
        public int DurationMs { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Result of a transaction sync operation.
    /// </summary>
    public class TransactionSyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int TransactionsAdded { get; set; }
        public int TransactionsModified { get; set; }
        public int TransactionsRemoved { get; set; }
        public bool HasMore { get; set; }
        public int DurationMs { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Service interface for Plaid operations.
    /// </summary>
    public interface IPlaidService
    {
        /// <summary>
        /// Creates a Plaid Link token for the frontend to initiate the Link flow.
        /// </summary>
        Task<string> CreateLinkTokenAsync(int userId);

        /// <summary>
        /// Exchanges a public token (from Plaid Link) for an access token and creates the connection.
        /// </summary>
        Task<AccountConnection> ExchangePublicTokenAsync(int userId, string publicToken, string? institutionId = null, string? institutionName = null);

        /// <summary>
        /// Fetches accounts from Plaid and creates/updates CashAccount records.
        /// </summary>
        Task<List<CashAccount>> FetchAndSyncAccountsAsync(Guid connectionId);

        /// <summary>
        /// Syncs balance for a specific connection.
        /// </summary>
        Task<SyncResult> SyncConnectionAsync(Guid connectionId);

        /// <summary>
        /// Syncs all connections for a user.
        /// </summary>
        Task<SyncResult> SyncAllUserConnectionsAsync(int userId);

        /// <summary>
        /// Disconnects and removes a Plaid connection.
        /// </summary>
        Task DisconnectAsync(Guid connectionId);

        /// <summary>
        /// Creates an update-mode Link token for reconnecting an existing connection.
        /// </summary>
        Task<string> CreateReconnectLinkTokenAsync(Guid connectionId);

        /// <summary>
        /// Marks a reconnection as successful (after user completes update mode Link).
        /// </summary>
        Task ReconnectSuccessAsync(Guid connectionId);

        /// <summary>
        /// Permanently deletes a connection and optionally its linked accounts.
        /// </summary>
        Task DeleteConnectionAsync(Guid connectionId, bool deleteAccounts);

        /// <summary>
        /// Gets all connections for a user.
        /// </summary>
        Task<List<AccountConnection>> GetUserConnectionsAsync(int userId);

        /// <summary>
        /// Gets accounts for a specific connection.
        /// </summary>
        Task<List<CashAccount>> GetConnectionAccountsAsync(Guid connectionId);

        /// <summary>
        /// Gets sync history for a connection.
        /// </summary>
        Task<List<SyncHistory>> GetSyncHistoryAsync(Guid connectionId, int limit = 10);

        /// <summary>
        /// Syncs transactions for a connection using /transactions/sync cursor-based approach.
        /// </summary>
        Task<TransactionSyncResult> SyncTransactionsAsync(Guid connectionId);

        /// <summary>
        /// Gets transactions for a connection with optional filtering.
        /// </summary>
        Task<List<CashTransaction>> GetConnectionTransactionsAsync(Guid connectionId, DateTime? startDate = null, DateTime? endDate = null, int? limit = null);
    }

    /// <summary>
    /// Implementation of Plaid service using Going.Plaid SDK.
    /// </summary>
    public class PlaidService : IPlaidService
    {
        private readonly PlaidClient _plaidClient;
        private readonly ApplicationDbContext _db;
        private readonly ICredentialEncryptionService _encryption;
        private readonly ILogger<PlaidService> _logger;
        private readonly PlaidOptions _options;

        public PlaidService(
            ApplicationDbContext db,
            ICredentialEncryptionService encryption,
            IConfiguration configuration,
            ILogger<PlaidService> logger)
        {
            _db = db;
            _encryption = encryption;
            _logger = logger;

            // Load Plaid configuration
            _options = new PlaidOptions();
            configuration.GetSection("Plaid").Bind(_options);

            // Determine environment
            var environment = _options.Environment.ToLower() switch
            {
                "production" => Going.Plaid.Environment.Production,
                "development" => Going.Plaid.Environment.Development,
                _ => Going.Plaid.Environment.Sandbox
            };

            // Initialize Plaid client
            _plaidClient = new PlaidClient(environment);
        }

        public async Task<string> CreateLinkTokenAsync(int userId)
        {
            _logger.LogInformation("Creating Plaid Link token for user {UserId}", userId);

            var request = new LinkTokenCreateRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                User = new LinkTokenCreateRequestUser
                {
                    ClientUserId = userId.ToString()
                },
                ClientName = "PFMP",
                Products = new[] { Products.Transactions }, // Transactions product includes balance
                CountryCodes = new[] { CountryCode.Us },
                Language = Language.English
            };

            var response = await _plaidClient.LinkTokenCreateAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid Link token creation failed: {ErrorCode} - {ErrorMessage}", 
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            _logger.LogInformation("Plaid Link token created successfully for user {UserId}", userId);
            return response.LinkToken;
        }

        public async Task<AccountConnection> ExchangePublicTokenAsync(
            int userId, 
            string publicToken, 
            string? institutionId = null, 
            string? institutionName = null)
        {
            _logger.LogInformation("Exchanging public token for user {UserId}", userId);

            var request = new ItemPublicTokenExchangeRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                PublicToken = publicToken
            };

            var response = await _plaidClient.ItemPublicTokenExchangeAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid token exchange failed: {ErrorCode} - {ErrorMessage}",
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            // Encrypt the access token before storing
            var encryptedToken = _encryption.Encrypt(response.AccessToken);

            // Create the connection record
            var connection = new AccountConnection
            {
                UserId = userId,
                Source = AccountSource.Plaid,
                PlaidItemId = response.ItemId,
                PlaidAccessToken = encryptedToken,
                PlaidInstitutionId = institutionId,
                PlaidInstitutionName = institutionName,
                Status = SyncStatus.Connected,
                ConnectedAt = DateTime.UtcNow
            };

            _db.AccountConnections.Add(connection);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Plaid connection created for user {UserId}, ConnectionId: {ConnectionId}", 
                userId, connection.ConnectionId);

            // Immediately fetch and sync accounts
            await FetchAndSyncAccountsAsync(connection.ConnectionId);

            return connection;
        }

        public async Task<List<CashAccount>> FetchAndSyncAccountsAsync(Guid connectionId)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            _logger.LogInformation("Fetching accounts for connection {ConnectionId}", connectionId);

            // Decrypt the access token
            var accessToken = _encryption.Decrypt(connection.PlaidAccessToken!);

            var request = new AccountsBalanceGetRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                AccessToken = accessToken
            };

            var response = await _plaidClient.AccountsBalanceGetAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid accounts fetch failed: {ErrorCode} - {ErrorMessage}",
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                
                connection.Status = SyncStatus.SyncFailed;
                connection.ErrorMessage = response.Error.ErrorMessage;
                connection.SyncFailureCount++;
                await _db.SaveChangesAsync();
                
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            var syncedAccounts = new List<CashAccount>();

            foreach (var plaidAccount in response.Accounts)
            {
                // Only process depository accounts (checking, savings, money market, CD)
                if (plaidAccount.Type != Going.Plaid.Entity.AccountType.Depository)
                {
                    _logger.LogDebug("Skipping non-depository account {AccountId}: {Type}", 
                        plaidAccount.AccountId, plaidAccount.Type);
                    continue;
                }

                // Map Plaid subtype to our account type
                var accountType = MapPlaidSubtypeToAccountType(plaidAccount.Subtype);

                // Find existing account by PlaidAccountId
                var existingAccount = await _db.CashAccounts
                    .FirstOrDefaultAsync(a => 
                        a.UserId == connection.UserId && 
                        a.PlaidAccountId == plaidAccount.AccountId);

                if (existingAccount != null)
                {
                    // Update existing account
                    existingAccount.Balance = (decimal)(plaidAccount.Balances.Current ?? 0);
                    existingAccount.LastSyncedAt = DateTime.UtcNow;
                    existingAccount.SyncStatus = SyncStatus.Connected;
                    existingAccount.SyncErrorMessage = null;
                    existingAccount.UpdatedAt = DateTime.UtcNow;

                    // Update institution name if we have it now
                    if (!string.IsNullOrEmpty(connection.PlaidInstitutionName))
                    {
                        existingAccount.Institution = connection.PlaidInstitutionName;
                    }

                    syncedAccounts.Add(existingAccount);
                    _logger.LogDebug("Updated existing account {AccountId} with balance {Balance}", 
                        existingAccount.CashAccountId, existingAccount.Balance);
                }
                else
                {
                    // Create new account
                    var newAccount = new CashAccount
                    {
                        UserId = connection.UserId,
                        Nickname = plaidAccount.Name,
                        Institution = connection.PlaidInstitutionName,
                        AccountNumber = plaidAccount.Mask, // Last 4 digits
                        AccountType = accountType,
                        Balance = (decimal)(plaidAccount.Balances.Current ?? 0),
                        Source = AccountSource.Plaid,
                        PlaidItemId = connection.PlaidItemId,
                        PlaidAccountId = plaidAccount.AccountId,
                        LastSyncedAt = DateTime.UtcNow,
                        SyncStatus = SyncStatus.Connected,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _db.CashAccounts.Add(newAccount);
                    syncedAccounts.Add(newAccount);
                    _logger.LogInformation("Created new Plaid-linked account: {Nickname} ({Type}) with balance {Balance}", 
                        newAccount.Nickname, newAccount.AccountType, newAccount.Balance);
                }
            }

            // Update connection status
            connection.LastSyncedAt = DateTime.UtcNow;
            connection.Status = SyncStatus.Connected;
            connection.ErrorMessage = null;
            connection.SyncFailureCount = 0;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Synced {Count} accounts for connection {ConnectionId}", 
                syncedAccounts.Count, connectionId);

            return syncedAccounts;
        }

        public async Task<SyncResult> SyncConnectionAsync(Guid connectionId)
        {
            var startTime = DateTime.UtcNow;
            var result = new SyncResult();

            try
            {
                var accounts = await FetchAndSyncAccountsAsync(connectionId);
                
                result.Success = true;
                result.AccountsUpdated = accounts.Count;
                result.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                // Log sync history
                var history = new SyncHistory
                {
                    ConnectionId = connectionId,
                    SyncStartedAt = startTime,
                    SyncCompletedAt = DateTime.UtcNow,
                    Status = SyncStatus.Connected,
                    AccountsUpdated = accounts.Count,
                    DurationMs = result.DurationMs
                };
                _db.SyncHistory.Add(history);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sync failed for connection {ConnectionId}", connectionId);
                
                result.Success = false;
                result.ErrorMessage = ex.Message;
                result.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                // Log failed sync history
                var history = new SyncHistory
                {
                    ConnectionId = connectionId,
                    SyncStartedAt = startTime,
                    SyncCompletedAt = DateTime.UtcNow,
                    Status = SyncStatus.SyncFailed,
                    ErrorMessage = ex.Message,
                    DurationMs = result.DurationMs
                };
                _db.SyncHistory.Add(history);
                await _db.SaveChangesAsync();
            }

            return result;
        }

        public async Task<SyncResult> SyncAllUserConnectionsAsync(int userId)
        {
            var connections = await _db.AccountConnections
                .Where(c => c.UserId == userId && c.Status == SyncStatus.Connected)
                .ToListAsync();

            var totalResult = new SyncResult { Success = true };
            var startTime = DateTime.UtcNow;

            foreach (var connection in connections)
            {
                var result = await SyncConnectionAsync(connection.ConnectionId);
                totalResult.AccountsUpdated += result.AccountsUpdated;
                
                if (!result.Success)
                {
                    totalResult.Success = false;
                    totalResult.ErrorMessage ??= result.ErrorMessage;
                }
            }

            totalResult.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            return totalResult;
        }

        public async Task DisconnectAsync(Guid connectionId)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            _logger.LogInformation("Disconnecting Plaid connection {ConnectionId} (keeping token for reconnection)", connectionId);

            // Don't remove from Plaid - keep the access token for potential reconnection

            // Update linked CashAccounts to disconnected status
            var linkedCashAccounts = await _db.CashAccounts
                .Where(a => a.PlaidItemId == connection.PlaidItemId)
                .ToListAsync();

            foreach (var account in linkedCashAccounts)
            {
                account.SyncStatus = SyncStatus.Disconnected;
                account.SyncErrorMessage = "Connection paused by user";
            }

            // Update linked investment Accounts to disconnected status
            var linkedInvestmentAccounts = await _db.Accounts
                .Where(a => a.ConnectionId == connectionId)
                .ToListAsync();

            foreach (var account in linkedInvestmentAccounts)
            {
                account.PlaidSyncStatus = (int)SyncStatus.Disconnected;
                account.PlaidSyncErrorMessage = "Connection paused by user";
            }

            // Update linked liability accounts to disconnected status
            var linkedLiabilities = await _db.LiabilityAccounts
                .Where(l => l.PlaidItemId == connection.PlaidItemId && l.UserId == connection.UserId)
                .ToListAsync();

            foreach (var liability in linkedLiabilities)
            {
                liability.SyncStatus = "disconnected";
            }

            // Mark connection as disconnected (keep access token for reconnection)
            connection.Status = SyncStatus.Disconnected;
            connection.ErrorMessage = "Disconnected by user - can be reconnected";
            // NOTE: We keep PlaidAccessToken so user can reconnect later

            await _db.SaveChangesAsync();

            _logger.LogInformation("Plaid connection {ConnectionId} disconnected successfully", connectionId);
        }

        public async Task<string> CreateReconnectLinkTokenAsync(Guid connectionId)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            if (string.IsNullOrEmpty(connection.PlaidAccessToken))
            {
                throw new InvalidOperationException("Cannot reconnect - access token was deleted. Please link the bank again.");
            }

            _logger.LogInformation("Creating update-mode Link token for reconnection {ConnectionId}", connectionId);

            var accessToken = _encryption.Decrypt(connection.PlaidAccessToken);

            // Create link token in update mode (with access_token, without products)
            var request = new LinkTokenCreateRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                User = new LinkTokenCreateRequestUser
                {
                    ClientUserId = connection.UserId.ToString()
                },
                ClientName = "PFMP",
                AccessToken = accessToken, // This puts Link in update mode
                CountryCodes = new[] { CountryCode.Us },
                Language = Language.English
                // NOTE: Do NOT include Products array for update mode
            };

            var response = await _plaidClient.LinkTokenCreateAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid update-mode Link token creation failed: {ErrorCode} - {ErrorMessage}", 
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            _logger.LogInformation("Update-mode Link token created for connection {ConnectionId}", connectionId);
            return response.LinkToken;
        }

        public async Task ReconnectSuccessAsync(Guid connectionId)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            _logger.LogInformation("Marking connection {ConnectionId} as reconnected", connectionId);

            connection.Status = SyncStatus.Connected;
            connection.ErrorMessage = null;

            // Update linked accounts status
            var linkedAccounts = await _db.CashAccounts
                .Where(a => a.PlaidItemId == connection.PlaidItemId)
                .ToListAsync();

            foreach (var account in linkedAccounts)
            {
                account.SyncStatus = SyncStatus.Connected;
                account.SyncErrorMessage = null;
            }

            await _db.SaveChangesAsync();

            // Trigger a sync to get fresh data
            await FetchAndSyncAccountsAsync(connectionId);

            _logger.LogInformation("Connection {ConnectionId} reconnected and synced successfully", connectionId);
        }

        public async Task DeleteConnectionAsync(Guid connectionId, bool deleteAccounts)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            _logger.LogInformation("Permanently deleting Plaid connection {ConnectionId}, deleteAccounts={DeleteAccounts}", 
                connectionId, deleteAccounts);

            // Remove the Item from Plaid if we still have a token
            if (!string.IsNullOrEmpty(connection.PlaidAccessToken))
            {
                try
                {
                    var accessToken = _encryption.Decrypt(connection.PlaidAccessToken);
                    var request = new ItemRemoveRequest
                    {
                        ClientId = _options.ClientId,
                        Secret = _options.Secret,
                        AccessToken = accessToken
                    };
                    await _plaidClient.ItemRemoveAsync(request);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to remove Plaid item from Plaid servers");
                }
            }

            // Handle linked CashAccounts (banking)
            var linkedCashAccounts = await _db.CashAccounts
                .Where(a => a.PlaidItemId == connection.PlaidItemId)
                .ToListAsync();

            if (deleteAccounts)
            {
                // Delete the CashAccounts entirely
                _db.CashAccounts.RemoveRange(linkedCashAccounts);
                _logger.LogInformation("Deleted {Count} linked cash accounts", linkedCashAccounts.Count);
            }
            else
            {
                // Keep CashAccounts but unlink them (convert to manual accounts)
                foreach (var account in linkedCashAccounts)
                {
                    account.Source = AccountSource.Manual;
                    account.PlaidItemId = null;
                    account.PlaidAccountId = null;
                    account.SyncStatus = SyncStatus.NotConnected;
                    account.SyncErrorMessage = null;
                    account.LastSyncedAt = null;
                }
                _logger.LogInformation("Unlinked {Count} cash accounts (converted to manual)", linkedCashAccounts.Count);
            }

            // Handle linked investment Accounts (unified connection or investments-only)
            var linkedInvestmentAccounts = await _db.Accounts
                .Where(a => a.ConnectionId == connectionId)
                .ToListAsync();

            if (deleteAccounts)
            {
                // First delete holdings for these accounts
                var accountIds = linkedInvestmentAccounts.Select(a => a.AccountId).ToList();
                var holdings = await _db.Holdings
                    .Where(h => accountIds.Contains(h.AccountId))
                    .ToListAsync();
                _db.Holdings.RemoveRange(holdings);
                _logger.LogInformation("Deleted {Count} holdings from investment accounts", holdings.Count);

                // Delete investment transactions for these accounts
                var transactions = await _db.Transactions
                    .Where(t => accountIds.Contains(t.AccountId))
                    .ToListAsync();
                _db.Transactions.RemoveRange(transactions);
                _logger.LogInformation("Deleted {Count} investment transactions", transactions.Count);

                // Delete the investment accounts
                _db.Accounts.RemoveRange(linkedInvestmentAccounts);
                _logger.LogInformation("Deleted {Count} linked investment accounts", linkedInvestmentAccounts.Count);
            }
            else
            {
                // Keep investment accounts but unlink them (convert to manual)
                foreach (var account in linkedInvestmentAccounts)
                {
                    account.Source = (int)AccountSource.Manual;
                    account.ConnectionId = null;
                    account.PlaidItemId = null;
                    account.PlaidAccountId = null;
                    account.PlaidSyncStatus = (int)SyncStatus.NotConnected;
                    account.PlaidSyncErrorMessage = null;
                    account.PlaidLastSyncedAt = null;
                }
                _logger.LogInformation("Unlinked {Count} investment accounts (converted to manual)", linkedInvestmentAccounts.Count);
            }

            // Handle linked LiabilityAccounts (credit cards, mortgages, student loans)
            var linkedLiabilities = await _db.LiabilityAccounts
                .Where(l => l.PlaidItemId == connection.PlaidItemId && l.UserId == connection.UserId)
                .ToListAsync();

            if (deleteAccounts)
            {
                // Delete credit card transactions for these liability accounts
                var liabilityIds = linkedLiabilities.Select(l => l.LiabilityAccountId).ToList();
                var ccTransactions = await _db.CashTransactions
                    .Where(t => t.LiabilityAccountId.HasValue && liabilityIds.Contains(t.LiabilityAccountId.Value))
                    .ToListAsync();
                _db.CashTransactions.RemoveRange(ccTransactions);
                _logger.LogInformation("Deleted {Count} credit card transactions", ccTransactions.Count);

                // Delete linked properties (mortgage-linked)
                var linkedProperties = await _db.Properties
                    .Where(p => p.LinkedMortgageLiabilityId.HasValue && liabilityIds.Contains(p.LinkedMortgageLiabilityId.Value))
                    .ToListAsync();
                _db.Properties.RemoveRange(linkedProperties);
                _logger.LogInformation("Deleted {Count} mortgage-linked properties", linkedProperties.Count);

                // Delete the liability accounts
                _db.LiabilityAccounts.RemoveRange(linkedLiabilities);
                _logger.LogInformation("Deleted {Count} linked liability accounts", linkedLiabilities.Count);
            }
            else
            {
                // Keep liability accounts but unlink them (convert to manual)
                foreach (var liability in linkedLiabilities)
                {
                    liability.Source = AccountSource.Manual;
                    liability.PlaidItemId = null;
                    liability.PlaidAccountId = null;
                    liability.SyncStatus = null;
                    liability.LastSyncedAt = null;
                }
                _logger.LogInformation("Unlinked {Count} liability accounts (converted to manual)", linkedLiabilities.Count);
            }

            // Delete sync history for this connection
            var syncHistory = await _db.SyncHistory
                .Where(h => h.ConnectionId == connectionId)
                .ToListAsync();
            _db.SyncHistory.RemoveRange(syncHistory);

            // Delete the connection record
            _db.AccountConnections.Remove(connection);

            await _db.SaveChangesAsync();

            _logger.LogInformation("Plaid connection {ConnectionId} permanently deleted", connectionId);
        }

        public async Task<List<AccountConnection>> GetUserConnectionsAsync(int userId)
        {
            return await _db.AccountConnections
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.ConnectedAt)
                .ToListAsync();
        }

        public async Task<List<CashAccount>> GetConnectionAccountsAsync(Guid connectionId)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            return await _db.CashAccounts
                .Where(a => a.PlaidItemId == connection.PlaidItemId && a.UserId == connection.UserId)
                .OrderBy(a => a.Nickname)
                .ToListAsync();
        }

        public async Task<List<SyncHistory>> GetSyncHistoryAsync(Guid connectionId, int limit = 10)
        {
            return await _db.SyncHistory
                .Where(h => h.ConnectionId == connectionId)
                .OrderByDescending(h => h.SyncStartedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<TransactionSyncResult> SyncTransactionsAsync(Guid connectionId)
        {
            var startTime = DateTime.UtcNow;
            var result = new TransactionSyncResult();

            try
            {
                var connection = await _db.AccountConnections.FindAsync(connectionId);
                if (connection == null)
                {
                    throw new ArgumentException($"Connection {connectionId} not found");
                }

                if (string.IsNullOrEmpty(connection.PlaidAccessToken))
                {
                    throw new InvalidOperationException("Connection has no access token");
                }

                var accessToken = _encryption.Decrypt(connection.PlaidAccessToken);

                // Get linked accounts for this connection
                var linkedAccounts = await _db.CashAccounts
                    .Where(a => a.PlaidItemId == connection.PlaidItemId && a.UserId == connection.UserId)
                    .ToListAsync();

                if (!linkedAccounts.Any())
                {
                    _logger.LogWarning("No linked accounts found for connection {ConnectionId}", connectionId);
                    result.Success = true;
                    result.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
                    return result;
                }

                // Create a mapping of PlaidAccountId to CashAccountId
                var accountIdMap = linkedAccounts
                    .Where(a => !string.IsNullOrEmpty(a.PlaidAccountId))
                    .ToDictionary(a => a.PlaidAccountId!, a => a.CashAccountId);

                // Call Plaid transactions/sync endpoint
                var request = new TransactionsSyncRequest
                {
                    ClientId = _options.ClientId,
                    Secret = _options.Secret,
                    AccessToken = accessToken,
                    Cursor = connection.TransactionsCursor // null for first sync
                };

                var response = await _plaidClient.TransactionsSyncAsync(request);

                _logger.LogInformation(
                    "Transaction sync for {ConnectionId}: {Added} added, {Modified} modified, {Removed} removed, HasMore: {HasMore}",
                    connectionId,
                    response.Added.Count,
                    response.Modified.Count,
                    response.Removed.Count,
                    response.HasMore);

                // Process added transactions
                foreach (var txn in response.Added)
                {
                    if (!accountIdMap.TryGetValue(txn.AccountId, out var cashAccountId))
                    {
                        _logger.LogDebug("Skipping transaction for unlinked account {PlaidAccountId}", txn.AccountId);
                        continue;
                    }

                    // Check if transaction already exists
                    var existing = await _db.CashTransactions
                        .FirstOrDefaultAsync(t => t.PlaidTransactionId == txn.TransactionId);

                    if (existing != null)
                    {
                        // Update existing transaction
                        MapPlaidTransactionToEntity(txn, existing);
                        result.TransactionsModified++;
                    }
                    else
                    {
                        // Create new transaction
                        var newTxn = new CashTransaction
                        {
                            CashAccountId = cashAccountId,
                            PlaidTransactionId = txn.TransactionId,
                            Source = "Plaid"
                        };
                        MapPlaidTransactionToEntity(txn, newTxn);
                        _db.CashTransactions.Add(newTxn);
                        result.TransactionsAdded++;
                    }
                }

                // Process modified transactions
                foreach (var txn in response.Modified)
                {
                    var existing = await _db.CashTransactions
                        .FirstOrDefaultAsync(t => t.PlaidTransactionId == txn.TransactionId);

                    if (existing != null)
                    {
                        MapPlaidTransactionToEntity(txn, existing);
                        result.TransactionsModified++;
                    }
                }

                // Process removed transactions
                foreach (var removed in response.Removed)
                {
                    var existing = await _db.CashTransactions
                        .FirstOrDefaultAsync(t => t.PlaidTransactionId == removed.TransactionId);

                    if (existing != null)
                    {
                        _db.CashTransactions.Remove(existing);
                        result.TransactionsRemoved++;
                    }
                }

                // Update cursor and last sync time
                connection.TransactionsCursor = response.NextCursor;
                connection.TransactionsLastSyncedAt = DateTime.UtcNow;
                result.HasMore = response.HasMore;

                await _db.SaveChangesAsync();

                result.Success = true;
                result.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            }
            catch (Exception ex)
            {
                var innerMessage = ex.InnerException?.Message ?? ex.Message;
                _logger.LogError(ex, "Transaction sync failed for connection {ConnectionId}: {InnerError}", connectionId, innerMessage);
                result.Success = false;
                result.ErrorMessage = innerMessage;
                result.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
            }

            return result;
        }

        public async Task<List<CashTransaction>> GetConnectionTransactionsAsync(
            Guid connectionId,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int? limit = null)
        {
            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                throw new ArgumentException($"Connection {connectionId} not found");
            }

            // Get all cash accounts linked to this connection
            var accountIds = await _db.CashAccounts
                .Where(a => a.PlaidItemId == connection.PlaidItemId && a.UserId == connection.UserId)
                .Select(a => a.CashAccountId)
                .ToListAsync();

            var query = _db.CashTransactions
                .Where(t => t.CashAccountId.HasValue && accountIds.Contains(t.CashAccountId.Value));

            if (startDate.HasValue)
                query = query.Where(t => t.TransactionDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(t => t.TransactionDate <= endDate.Value);

            query = query.OrderByDescending(t => t.TransactionDate);

            if (limit.HasValue)
                query = query.Take(limit.Value);

            return await query.ToListAsync();
        }

        private static void MapPlaidTransactionToEntity(Going.Plaid.Entity.Transaction plaidTxn, CashTransaction entity)
        {
            // Plaid amounts: positive = money out, negative = money in
            // We store as: positive = money in, negative = money out
            entity.Amount = -(plaidTxn.Amount ?? 0);
            
            // Convert DateOnly to UTC DateTime
            if (plaidTxn.Date.HasValue)
            {
                entity.TransactionDate = DateTime.SpecifyKind(
                    plaidTxn.Date.Value.ToDateTime(TimeOnly.MinValue), 
                    DateTimeKind.Utc);
            }
            else
            {
                entity.TransactionDate = DateTime.UtcNow;
            }
            
            entity.Description = plaidTxn.MerchantName 
                ?? plaidTxn.OriginalDescription 
                ?? plaidTxn.Name  // Plaid's cleaned transaction name
                ?? plaidTxn.PersonalFinanceCategory?.Primary?.Replace("_", " ")
                ?? "Unknown";
            entity.ExternalTransactionId = plaidTxn.TransactionId;

            // Required non-nullable fields
            entity.IsPending = plaidTxn.Pending ?? false;
            entity.IsRecurring = false; // Plaid doesn't provide this directly
            entity.CreatedAt = DateTime.UtcNow;

            // Plaid-specific fields
            entity.PlaidCategory = plaidTxn.PersonalFinanceCategory?.Primary;
            entity.PlaidCategoryDetailed = plaidTxn.PersonalFinanceCategory?.Detailed;
            entity.PaymentChannel = plaidTxn.PaymentChannel?.ToString()?.ToLowerInvariant();
            entity.MerchantLogoUrl = plaidTxn.LogoUrl;

            // Map category to our types
            entity.TransactionType = MapPlaidCategoryToType(plaidTxn.PersonalFinanceCategory?.Primary);
            entity.Category = MapPlaidCategoryToOurCategory(plaidTxn.PersonalFinanceCategory?.Primary);
        }

        private static string MapPlaidCategoryToType(string? plaidCategory)
        {
            if (string.IsNullOrEmpty(plaidCategory)) return "other";

            return plaidCategory.ToUpperInvariant() switch
            {
                "INCOME" => "deposit",
                "TRANSFER_IN" => "transfer_in",
                "TRANSFER_OUT" => "transfer_out",
                "LOAN_PAYMENTS" => "payment",
                "BANK_FEES" => "fee",
                "ENTERTAINMENT" or "FOOD_AND_DRINK" or "GENERAL_MERCHANDISE" or 
                "GENERAL_SERVICES" or "GOVERNMENT_AND_NON_PROFIT" or "HOME_IMPROVEMENT" or
                "MEDICAL" or "PERSONAL_CARE" or "RENT_AND_UTILITIES" or "TRANSPORTATION" or
                "TRAVEL" => "withdrawal",
                _ => "other"
            };
        }

        private static string MapPlaidCategoryToOurCategory(string? plaidCategory)
        {
            if (string.IsNullOrEmpty(plaidCategory)) return "Uncategorized";

            return plaidCategory.ToUpperInvariant() switch
            {
                "INCOME" => "Income",
                "TRANSFER_IN" => "Transfer In",
                "TRANSFER_OUT" => "Transfer Out",
                "LOAN_PAYMENTS" => "Debt Payment",
                "BANK_FEES" => "Fees",
                "ENTERTAINMENT" => "Entertainment",
                "FOOD_AND_DRINK" => "Food & Drink",
                "GENERAL_MERCHANDISE" => "Shopping",
                "GENERAL_SERVICES" => "Services",
                "GOVERNMENT_AND_NON_PROFIT" => "Government",
                "HOME_IMPROVEMENT" => "Home",
                "MEDICAL" => "Healthcare",
                "PERSONAL_CARE" => "Personal Care",
                "RENT_AND_UTILITIES" => "Bills & Utilities",
                "TRANSPORTATION" => "Transportation",
                "TRAVEL" => "Travel",
                _ => "Uncategorized"
            };
        }

        private static string MapPlaidSubtypeToAccountType(AccountSubtype? subtype)
        {
            return subtype switch
            {
                AccountSubtype.Checking => "checking",
                AccountSubtype.Savings => "savings",
                AccountSubtype.MoneyMarket => "money_market",
                AccountSubtype.Cd => "cd",
                AccountSubtype.Hsa => "hsa",
                AccountSubtype.CashManagement => "checking",
                _ => "checking" // Default to checking
            };
        }
    }
}
