using Going.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Investments;
using Going.Plaid.Item;
using Going.Plaid.Link;
using Going.Plaid.Sandbox;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Plaid;
using System.Text.Json;
using PfmpAccount = PFMP_API.Models.Account;
using PfmpAccountType = PFMP_API.Models.AccountType;
using PfmpHolding = PFMP_API.Models.Holding;
using PfmpTransaction = PFMP_API.Models.Transaction;

namespace PFMP_API.Services.Plaid
{
    /// <summary>
    /// Result of an investments sync operation.
    /// </summary>
    public class InvestmentsSyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int AccountsUpdated { get; set; }
        public int HoldingsUpdated { get; set; }
        public int SecuritiesUpdated { get; set; }
        public int DurationMs { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Result of an investment transactions sync operation.
    /// </summary>
    public class InvestmentTransactionsSyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int TransactionsCreated { get; set; }
        public int TransactionsUpdated { get; set; }
        public int TransactionsTotal { get; set; }
        public int DurationMs { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Service interface for Plaid Investments operations.
    /// </summary>
    public interface IPlaidInvestmentsService
    {
        /// <summary>
        /// Creates a Plaid Link token for investments product.
        /// </summary>
        Task<string> CreateInvestmentsLinkTokenAsync(int userId);

        /// <summary>
        /// Exchanges a public token for an access token and creates an investments connection.
        /// </summary>
        Task<AccountConnection> ExchangeInvestmentsPublicTokenAsync(
            int userId, 
            string publicToken, 
            string? institutionId = null, 
            string? institutionName = null);

        /// <summary>
        /// Fetches and syncs investment holdings from Plaid.
        /// </summary>
        Task<InvestmentsSyncResult> SyncInvestmentHoldingsAsync(Guid connectionId);

        /// <summary>
        /// Syncs all investment connections for a user.
        /// </summary>
        Task<InvestmentsSyncResult> SyncAllUserInvestmentsAsync(int userId);

        /// <summary>
        /// Creates a sandbox test user with custom investment accounts.
        /// Returns a public token that can be exchanged.
        /// </summary>
        Task<SandboxSeedResult> CreateSandboxInvestmentUserAsync(int userId, SandboxInvestmentConfig config);

        /// <summary>
        /// Gets all investment accounts for a user.
        /// </summary>
        Task<List<PfmpAccount>> GetUserInvestmentAccountsAsync(int userId);

        /// <summary>
        /// Gets holdings for a specific investment account.
        /// </summary>
        Task<List<PfmpHolding>> GetAccountHoldingsAsync(int accountId);

        /// <summary>
        /// Fetches and syncs investment transactions from Plaid.
        /// </summary>
        Task<InvestmentTransactionsSyncResult> SyncInvestmentTransactionsAsync(Guid connectionId, DateOnly? startDate = null, DateOnly? endDate = null);

        /// <summary>
        /// Gets investment transactions for a specific account.
        /// </summary>
        Task<List<PfmpTransaction>> GetAccountInvestmentTransactionsAsync(int accountId, int limit = 50);
    }

    /// <summary>
    /// Result of sandbox seeding operation.
    /// </summary>
    public class SandboxSeedResult
    {
        public bool Success { get; set; }
        public string? PublicToken { get; set; }
        public string? AccessToken { get; set; }
        public string? ItemId { get; set; }
        public Guid? ConnectionId { get; set; }
        public int AccountsCreated { get; set; }
        public int HoldingsCreated { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Configuration for creating a sandbox investment user.
    /// </summary>
    public class SandboxInvestmentConfig
    {
        /// <summary>
        /// Name for the investment account.
        /// </summary>
        public string AccountName { get; set; } = "Test Investment Account";

        /// <summary>
        /// Account subtype (brokerage, 401k, ira, etc.)
        /// </summary>
        public string AccountSubtype { get; set; } = "brokerage";

        /// <summary>
        /// Starting balance in the account.
        /// </summary>
        public decimal StartingBalance { get; set; } = 100000m;

        /// <summary>
        /// Holdings to seed in the account.
        /// </summary>
        public List<SandboxHoldingConfig> Holdings { get; set; } = new();
    }

    /// <summary>
    /// Configuration for a sandbox holding.
    /// </summary>
    public class SandboxHoldingConfig
    {
        public string SecurityId { get; set; } = string.Empty;
        public string TickerSymbol { get; set; } = string.Empty;
        public string SecurityName { get; set; } = string.Empty;
        public string SecurityType { get; set; } = "equity";
        public decimal Quantity { get; set; }
        public decimal CostBasis { get; set; }
        public decimal CurrentPrice { get; set; }
        public string? Cusip { get; set; }
        public string? Isin { get; set; }
    }

    /// <summary>
    /// Implementation of Plaid Investments service.
    /// </summary>
    public class PlaidInvestmentsService : IPlaidInvestmentsService
    {
        private readonly PlaidClient _plaidClient;
        private readonly ApplicationDbContext _db;
        private readonly ICredentialEncryptionService _encryption;
        private readonly ILogger<PlaidInvestmentsService> _logger;
        private readonly PlaidOptions _options;

        public PlaidInvestmentsService(
            ApplicationDbContext db,
            ICredentialEncryptionService encryption,
            IConfiguration configuration,
            ILogger<PlaidInvestmentsService> logger)
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

        public async Task<string> CreateInvestmentsLinkTokenAsync(int userId)
        {
            _logger.LogInformation("Creating Plaid Investments Link token for user {UserId}", userId);

            var request = new LinkTokenCreateRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                User = new LinkTokenCreateRequestUser
                {
                    ClientUserId = userId.ToString()
                },
                ClientName = "PFMP",
                Products = new[] { Products.Investments },
                CountryCodes = new[] { CountryCode.Us },
                Language = Language.English
            };

            var response = await _plaidClient.LinkTokenCreateAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid Investments Link token creation failed: {ErrorCode} - {ErrorMessage}",
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            _logger.LogInformation("Plaid Investments Link token created successfully for user {UserId}", userId);
            return response.LinkToken;
        }

        public async Task<AccountConnection> ExchangeInvestmentsPublicTokenAsync(
            int userId,
            string publicToken,
            string? institutionId = null,
            string? institutionName = null)
        {
            _logger.LogInformation("Exchanging investments public token for user {UserId}", userId);

            var request = new ItemPublicTokenExchangeRequest
            {
                ClientId = _options.ClientId,
                Secret = _options.Secret,
                PublicToken = publicToken
            };

            var response = await _plaidClient.ItemPublicTokenExchangeAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid investments token exchange failed: {ErrorCode} - {ErrorMessage}",
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new Exception($"Plaid error: {response.Error.ErrorMessage}");
            }

            // Encrypt the access token before storing
            var encryptedToken = _encryption.Encrypt(response.AccessToken);

            // Create the connection record with PlaidInvestments source
            var connection = new AccountConnection
            {
                UserId = userId,
                Source = AccountSource.PlaidInvestments,
                PlaidItemId = response.ItemId,
                PlaidAccessToken = encryptedToken,
                PlaidInstitutionId = institutionId,
                PlaidInstitutionName = institutionName ?? "Investment Account",
                Status = SyncStatus.Connected,
                ConnectedAt = DateTime.UtcNow
            };

            _db.AccountConnections.Add(connection);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Plaid investments connection created for user {UserId}, ConnectionId: {ConnectionId}",
                userId, connection.ConnectionId);

            // Immediately fetch and sync holdings
            await SyncInvestmentHoldingsAsync(connection.ConnectionId);

            return connection;
        }

        public async Task<InvestmentsSyncResult> SyncInvestmentHoldingsAsync(Guid connectionId)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var result = new InvestmentsSyncResult();

            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                return new InvestmentsSyncResult
                {
                    Success = false,
                    ErrorMessage = $"Connection {connectionId} not found"
                };
            }

            try
            {
                _logger.LogInformation("Syncing investment holdings for connection {ConnectionId}", connectionId);

                // Decrypt the access token
                var accessToken = _encryption.Decrypt(connection.PlaidAccessToken!);

                var request = new InvestmentsHoldingsGetRequest
                {
                    ClientId = _options.ClientId,
                    Secret = _options.Secret,
                    AccessToken = accessToken
                };

                var response = await _plaidClient.InvestmentsHoldingsGetAsync(request);

                if (response.Error != null)
                {
                    _logger.LogError("Plaid holdings fetch failed: {ErrorCode} - {ErrorMessage}",
                        response.Error.ErrorCode, response.Error.ErrorMessage);

                    connection.Status = SyncStatus.SyncFailed;
                    connection.ErrorMessage = response.Error.ErrorMessage;
                    connection.SyncFailureCount++;
                    await _db.SaveChangesAsync();

                    return new InvestmentsSyncResult
                    {
                        Success = false,
                        ErrorMessage = response.Error.ErrorMessage,
                        DurationMs = (int)stopwatch.ElapsedMilliseconds
                    };
                }

                // First, upsert securities
                foreach (var plaidSecurity in response.Securities)
                {
                    await UpsertSecurityAsync(plaidSecurity);
                    result.SecuritiesUpdated++;
                }

                // Then, process accounts and holdings
                foreach (var plaidAccount in response.Accounts)
                {
                    // Only process investment accounts
                    if (plaidAccount.Type != Going.Plaid.Entity.AccountType.Investment)
                    {
                        continue;
                    }

                    var account = await UpsertInvestmentAccountAsync(connection, plaidAccount);
                    result.AccountsUpdated++;

                    // Get holdings for this account
                    var accountHoldings = response.Holdings
                        .Where(h => h.AccountId == plaidAccount.AccountId)
                        .ToList();

                    foreach (var plaidHolding in accountHoldings)
                    {
                        await UpsertHoldingAsync(account, plaidHolding, response.Securities);
                        result.HoldingsUpdated++;
                    }
                }

                // Update connection status
                connection.LastSyncedAt = DateTime.UtcNow;
                connection.Status = SyncStatus.Connected;
                connection.ErrorMessage = null;
                connection.SyncFailureCount = 0;

                // Record sync history
                var syncHistory = new SyncHistory
                {
                    ConnectionId = connectionId,
                    Status = SyncStatus.Connected,
                    SyncStartedAt = DateTime.UtcNow.AddMilliseconds(-stopwatch.ElapsedMilliseconds),
                    SyncCompletedAt = DateTime.UtcNow,
                    AccountsUpdated = result.AccountsUpdated,
                    DurationMs = (int)stopwatch.ElapsedMilliseconds
                };
                _db.SyncHistory.Add(syncHistory);

                await _db.SaveChangesAsync();

                result.Success = true;
                result.SyncedAt = DateTime.UtcNow;
                result.DurationMs = (int)stopwatch.ElapsedMilliseconds;

                _logger.LogInformation(
                    "Investment holdings sync completed for connection {ConnectionId}: {Accounts} accounts, {Holdings} holdings, {Securities} securities in {Duration}ms",
                    connectionId, result.AccountsUpdated, result.HoldingsUpdated, result.SecuritiesUpdated, result.DurationMs);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Investment holdings sync failed for connection {ConnectionId}", connectionId);

                connection.Status = SyncStatus.SyncFailed;
                connection.ErrorMessage = ex.Message;
                connection.SyncFailureCount++;
                await _db.SaveChangesAsync();

                return new InvestmentsSyncResult
                {
                    Success = false,
                    ErrorMessage = ex.Message,
                    DurationMs = (int)stopwatch.ElapsedMilliseconds
                };
            }
        }

        public async Task<InvestmentsSyncResult> SyncAllUserInvestmentsAsync(int userId)
        {
            _logger.LogInformation("Syncing all investment connections for user {UserId}", userId);

            var connections = await _db.AccountConnections
                .Where(c => c.UserId == userId && c.Source == AccountSource.PlaidInvestments)
                .ToListAsync();

            var result = new InvestmentsSyncResult();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            foreach (var connection in connections)
            {
                var syncResult = await SyncInvestmentHoldingsAsync(connection.ConnectionId);
                result.AccountsUpdated += syncResult.AccountsUpdated;
                result.HoldingsUpdated += syncResult.HoldingsUpdated;
                result.SecuritiesUpdated += syncResult.SecuritiesUpdated;

                if (!syncResult.Success)
                {
                    result.ErrorMessage = syncResult.ErrorMessage;
                }
            }

            result.Success = string.IsNullOrEmpty(result.ErrorMessage);
            result.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            result.SyncedAt = DateTime.UtcNow;

            return result;
        }

        public async Task<SandboxSeedResult> CreateSandboxInvestmentUserAsync(int userId, SandboxInvestmentConfig config)
        {
            _logger.LogInformation("Creating sandbox investment user for user {UserId}", userId);

            // Validate we're in sandbox mode
            if (_options.Environment.ToLower() != "sandbox")
            {
                return new SandboxSeedResult
                {
                    Success = false,
                    ErrorMessage = "Sandbox seeding is only available in sandbox environment"
                };
            }

            try
            {
                // Use default sandbox credentials with investments product
                // The sandbox will create a default investment account with sample holdings
                var request = new SandboxPublicTokenCreateRequest
                {
                    ClientId = _options.ClientId,
                    Secret = _options.Secret,
                    InstitutionId = "ins_109508", // First Platypus Bank (sandbox institution)
                    InitialProducts = new[] { Products.Investments }
                    // Note: Not using Options/OverrideUsername because "user_investments" 
                    // isn't available in all sandbox configurations. Default user works.
                };

                _logger.LogInformation("Creating sandbox public token with investments product");
                var response = await _plaidClient.SandboxPublicTokenCreateAsync(request);

                if (response.Error != null)
                {
                    _logger.LogError("Sandbox public token creation failed: {ErrorCode} - {ErrorMessage}",
                        response.Error.ErrorCode, response.Error.ErrorMessage);
                    return new SandboxSeedResult
                    {
                        Success = false,
                        ErrorMessage = response.Error.ErrorMessage
                    };
                }

                _logger.LogInformation("Sandbox public token created, exchanging for access token");

                // Exchange for access token
                var connection = await ExchangeInvestmentsPublicTokenAsync(
                    userId,
                    response.PublicToken,
                    "ins_109508",
                    "First Platypus Bank (Sandbox)");

                // Get created accounts and holdings count
                var accounts = await _db.Accounts
                    .Where(a => a.ConnectionId == connection.ConnectionId)
                    .ToListAsync();

                var holdingsCount = await _db.Holdings
                    .CountAsync(h => accounts.Select(a => a.AccountId).Contains(h.AccountId));

                return new SandboxSeedResult
                {
                    Success = true,
                    PublicToken = response.PublicToken,
                    ItemId = connection.PlaidItemId,
                    ConnectionId = connection.ConnectionId,
                    AccountsCreated = accounts.Count,
                    HoldingsCreated = holdingsCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sandbox investment user creation failed for user {UserId}", userId);
                return new SandboxSeedResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<List<PfmpAccount>> GetUserInvestmentAccountsAsync(int userId)
        {
            return await _db.Accounts
                .Where(a => a.UserId == userId && a.Source == 3) // 3 = PlaidInvestments
                .OrderBy(a => a.AccountName)
                .ToListAsync();
        }

        public async Task<List<PfmpHolding>> GetAccountHoldingsAsync(int accountId)
        {
            return await _db.Holdings
                .Where(h => h.AccountId == accountId)
                .OrderBy(h => h.Symbol)
                .ToListAsync();
        }

        public async Task<InvestmentTransactionsSyncResult> SyncInvestmentTransactionsAsync(
            Guid connectionId, 
            DateOnly? startDate = null, 
            DateOnly? endDate = null)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var result = new InvestmentTransactionsSyncResult();

            var connection = await _db.AccountConnections.FindAsync(connectionId);
            if (connection == null)
            {
                return new InvestmentTransactionsSyncResult
                {
                    Success = false,
                    ErrorMessage = $"Connection {connectionId} not found"
                };
            }

            try
            {
                _logger.LogInformation("Syncing investment transactions for connection {ConnectionId}", connectionId);

                // Decrypt the access token
                var accessToken = _encryption.Decrypt(connection.PlaidAccessToken!);

                // Default to last 90 days if not specified
                var end = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var start = startDate ?? end.AddDays(-90);

                var request = new InvestmentsTransactionsGetRequest
                {
                    ClientId = _options.ClientId,
                    Secret = _options.Secret,
                    AccessToken = accessToken,
                    StartDate = start,
                    EndDate = end
                };

                var response = await _plaidClient.InvestmentsTransactionsGetAsync(request);

                if (response.Error != null)
                {
                    _logger.LogError("Plaid investment transactions fetch failed: {ErrorCode} - {ErrorMessage}",
                        response.Error.ErrorCode, response.Error.ErrorMessage);

                    return new InvestmentTransactionsSyncResult
                    {
                        Success = false,
                        ErrorMessage = response.Error.ErrorMessage,
                        DurationMs = (int)stopwatch.ElapsedMilliseconds
                    };
                }

                result.TransactionsTotal = response.TotalInvestmentTransactions;

                // Build a map of Plaid account IDs to our account IDs
                var accountMap = await _db.Accounts
                    .Where(a => a.ConnectionId == connectionId)
                    .ToDictionaryAsync(a => a.PlaidAccountId!, a => a.AccountId);

                // Build a map of security IDs to ticker symbols for reference
                var securityMap = response.Securities
                    .ToDictionary(s => s.SecurityId, s => s.TickerSymbol ?? "UNKNOWN");

                // Process each investment transaction
                foreach (var plaidTx in response.InvestmentTransactions)
                {
                    if (!accountMap.TryGetValue(plaidTx.AccountId, out var accountId))
                    {
                        _logger.LogWarning("No matching account found for Plaid account {PlaidAccountId}", plaidTx.AccountId);
                        continue;
                    }

                    var txResult = await UpsertInvestmentTransactionAsync(accountId, plaidTx, securityMap);
                    if (txResult.Created)
                        result.TransactionsCreated++;
                    else
                        result.TransactionsUpdated++;
                }

                await _db.SaveChangesAsync();

                result.Success = true;
                result.SyncedAt = DateTime.UtcNow;
                result.DurationMs = (int)stopwatch.ElapsedMilliseconds;

                _logger.LogInformation(
                    "Investment transactions sync completed for connection {ConnectionId}: {Created} created, {Updated} updated, {Total} total in {Duration}ms",
                    connectionId, result.TransactionsCreated, result.TransactionsUpdated, result.TransactionsTotal, result.DurationMs);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Investment transactions sync failed for connection {ConnectionId}", connectionId);

                return new InvestmentTransactionsSyncResult
                {
                    Success = false,
                    ErrorMessage = ex.Message,
                    DurationMs = (int)stopwatch.ElapsedMilliseconds
                };
            }
        }

        public async Task<List<PfmpTransaction>> GetAccountInvestmentTransactionsAsync(int accountId, int limit = 50)
        {
            return await _db.Transactions
                .Where(t => t.AccountId == accountId && t.Source == TransactionSource.PlaidInvestments)
                .OrderByDescending(t => t.TransactionDate)
                .Take(limit)
                .ToListAsync();
        }

        #region Private Helper Methods

        private async Task UpsertSecurityAsync(Security plaidSecurity)
        {
            var existing = await _db.PlaidSecurities
                .FirstOrDefaultAsync(s => s.PlaidSecurityId == plaidSecurity.SecurityId);

            if (existing != null)
            {
                existing.TickerSymbol = plaidSecurity.TickerSymbol;
                existing.Name = plaidSecurity.Name ?? string.Empty;
                existing.Type = plaidSecurity.Type ?? string.Empty;
                existing.Cusip = plaidSecurity.Cusip;
                existing.Isin = plaidSecurity.Isin;
                existing.ClosePrice = plaidSecurity.ClosePrice;
                existing.ClosePriceAsOf = plaidSecurity.ClosePriceAsOf?.ToDateTime(TimeOnly.MinValue);
                existing.IsCashEquivalent = plaidSecurity.IsCashEquivalent ?? false;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newSecurity = new PlaidSecurity
                {
                    PlaidSecurityId = plaidSecurity.SecurityId,
                    TickerSymbol = plaidSecurity.TickerSymbol,
                    Name = plaidSecurity.Name ?? string.Empty,
                    Type = plaidSecurity.Type ?? string.Empty,
                    Cusip = plaidSecurity.Cusip,
                    Isin = plaidSecurity.Isin,
                    ClosePrice = plaidSecurity.ClosePrice,
                    ClosePriceAsOf = plaidSecurity.ClosePriceAsOf?.ToDateTime(TimeOnly.MinValue),
                    IsCashEquivalent = plaidSecurity.IsCashEquivalent ?? false,
                    IsoCurrencyCode = plaidSecurity.IsoCurrencyCode,
                    UnofficialCurrencyCode = plaidSecurity.UnofficialCurrencyCode,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.PlaidSecurities.Add(newSecurity);
            }
        }

        private async Task<PfmpAccount> UpsertInvestmentAccountAsync(AccountConnection connection, Going.Plaid.Entity.Account plaidAccount)
        {
            var existing = await _db.Accounts
                .FirstOrDefaultAsync(a => a.PlaidAccountId == plaidAccount.AccountId);

            if (existing != null)
            {
                existing.CurrentBalance = (decimal)(plaidAccount.Balances.Current ?? 0);
                existing.PlaidLastSyncedAt = DateTime.UtcNow;
                existing.PlaidSyncStatus = 1; // Connected
                existing.PlaidSyncErrorMessage = null;
                existing.UpdatedAt = DateTime.UtcNow;
                return existing;
            }
            else
            {
                var accountType = MapPlaidSubtypeToAccountType(plaidAccount.Subtype);
                var newAccount = new PfmpAccount
                {
                    UserId = connection.UserId,
                    AccountName = plaidAccount.Name,
                    AccountType = accountType,
                    CurrentBalance = (decimal)(plaidAccount.Balances.Current ?? 0),
                    Source = 3, // PlaidInvestments
                    PlaidItemId = connection.PlaidItemId,
                    PlaidAccountId = plaidAccount.AccountId,
                    ConnectionId = connection.ConnectionId,
                    PlaidLastSyncedAt = DateTime.UtcNow,
                    PlaidSyncStatus = 1, // Connected
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Accounts.Add(newAccount);
                await _db.SaveChangesAsync(); // Save to get AccountId
                return newAccount;
            }
        }

        private async Task UpsertHoldingAsync(
            PfmpAccount account,
            Going.Plaid.Entity.Holding plaidHolding,
            IEnumerable<Security> securities)
        {
            var security = securities.FirstOrDefault(s => s.SecurityId == plaidHolding.SecurityId);

            var existing = await _db.Holdings
                .FirstOrDefaultAsync(h => 
                    h.AccountId == account.AccountId && 
                    h.PlaidSecurityId == plaidHolding.SecurityId);

            var quantity = plaidHolding.Quantity;
            var costBasis = plaidHolding.CostBasis ?? 0m;
            var avgCostBasis = quantity != 0m ? costBasis / quantity : 0m;
            var currentPrice = plaidHolding.InstitutionPrice;

            if (existing != null)
            {
                existing.Symbol = security?.TickerSymbol ?? "UNKNOWN";
                existing.Quantity = quantity;
                existing.AverageCostBasis = avgCostBasis;
                existing.CurrentPrice = currentPrice;
                existing.Cusip = security?.Cusip;
                existing.Isin = security?.Isin;
                existing.PlaidLastSyncedAt = DateTime.UtcNow;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newHolding = new PfmpHolding
                {
                    AccountId = account.AccountId,
                    Symbol = security?.TickerSymbol ?? "UNKNOWN",
                    Quantity = quantity,
                    AverageCostBasis = avgCostBasis,
                    CurrentPrice = currentPrice,
                    PlaidSecurityId = plaidHolding.SecurityId,
                    PlaidHoldingId = $"{plaidHolding.AccountId}_{plaidHolding.SecurityId}",
                    Cusip = security?.Cusip,
                    Isin = security?.Isin,
                    PlaidLastSyncedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Holdings.Add(newHolding);
            }
        }

        private async Task<(bool Created, PfmpTransaction Tx)> UpsertInvestmentTransactionAsync(
            int accountId,
            Going.Plaid.Entity.InvestmentTransaction plaidTx,
            Dictionary<string, string?> securityMap)
        {
            // Check if transaction already exists
            var existing = await _db.Transactions
                .FirstOrDefaultAsync(t => t.PlaidTransactionId == plaidTx.InvestmentTransactionId);

            var symbol = plaidTx.SecurityId != null && securityMap.TryGetValue(plaidTx.SecurityId, out var sym)
                ? sym
                : null;

            // Map Plaid type/subtype to our transaction type (convert enums to strings)
            var typeStr = plaidTx.Type.ToString();
            var subtypeStr = plaidTx.Subtype.ToString();
            var txType = MapPlaidInvestmentType(typeStr, subtypeStr);

            if (existing != null)
            {
                // Update existing transaction
                existing.Amount = (decimal)plaidTx.Amount;
                existing.Quantity = plaidTx.Quantity != 0 ? (decimal)plaidTx.Quantity : null;
                existing.Price = plaidTx.Price != 0 ? (decimal)plaidTx.Price : null;
                existing.Fee = plaidTx.Fees != 0 ? (decimal)plaidTx.Fees : null;
                existing.Symbol = symbol;
                existing.Description = plaidTx.Name;
                existing.PlaidInvestmentType = typeStr;
                existing.PlaidInvestmentSubtype = subtypeStr;
                return (false, existing);
            }
            else
            {
                // Create new transaction
                var txDate = plaidTx.Date.ToDateTime(TimeOnly.MinValue);
                var transaction = new PfmpTransaction
                {
                    AccountId = accountId,
                    TransactionType = txType,
                    Symbol = symbol,
                    Quantity = plaidTx.Quantity != 0 ? (decimal)plaidTx.Quantity : null,
                    Price = plaidTx.Price != 0 ? (decimal)plaidTx.Price : null,
                    Amount = (decimal)plaidTx.Amount,
                    Fee = plaidTx.Fees != 0 ? (decimal)plaidTx.Fees : null,
                    TransactionDate = DateTime.SpecifyKind(txDate, DateTimeKind.Utc),
                    SettlementDate = DateTime.SpecifyKind(txDate, DateTimeKind.Utc),
                    Source = TransactionSource.PlaidInvestments,
                    ExternalTransactionId = plaidTx.InvestmentTransactionId,
                    PlaidTransactionId = plaidTx.InvestmentTransactionId,
                    PlaidSecurityId = plaidTx.SecurityId,
                    PlaidInvestmentType = typeStr,
                    PlaidInvestmentSubtype = subtypeStr,
                    Description = plaidTx.Name,
                    CreatedAt = DateTime.UtcNow,
                    IsTaxable = true,
                    IsDividendReinvestment = subtypeStr?.Contains("reinvest", StringComparison.OrdinalIgnoreCase) == true
                };

                _db.Transactions.Add(transaction);
                return (true, transaction);
            }
        }

        private static string MapPlaidInvestmentType(string? type, string? subtype)
        {
            // Plaid types: buy, sell, cash (for dividends, interest), cancel, fee, transfer
            // Plaid subtypes: dividend, interest, contribution, withdrawal, etc.

            var typeLower = type?.ToLowerInvariant() ?? "";
            var subtypeLower = subtype?.ToLowerInvariant() ?? "";

            return typeLower switch
            {
                "buy" => TransactionTypes.Buy,
                "sell" => TransactionTypes.Sell,
                "cash" when subtypeLower == "dividend" => TransactionTypes.Dividend,
                "cash" when subtypeLower == "interest" => TransactionTypes.Interest,
                "cash" when subtypeLower == "contribution" => TransactionTypes.Deposit,
                "cash" when subtypeLower == "withdrawal" => TransactionTypes.Withdrawal,
                "cash" => TransactionTypes.Other,
                "fee" => TransactionTypes.Fee,
                "transfer" => TransactionTypes.Transfer,
                "cancel" => TransactionTypes.Other,
                _ => TransactionTypes.Other
            };
        }

        private object BuildSandboxConfig(SandboxInvestmentConfig config)
        {
            // Build investment transactions for holdings
            // Using Plaid's version 2 format with override_accounts
            // See: https://plaid.com/docs/sandbox/user-custom/
            var investmentTransactions = new List<object>();
            decimal totalValue = 0;

            foreach (var holding in config.Holdings)
            {
                var marketValue = holding.Quantity * holding.CurrentPrice;
                totalValue += marketValue;
                
                // Create a "buy" transaction for each holding
                investmentTransactions.Add(new
                {
                    date = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd"),
                    name = $"Buy {holding.TickerSymbol}",
                    quantity = holding.Quantity,
                    price = holding.CostBasis / holding.Quantity,
                    fees = 0.00,
                    type = "buy",
                    currency = "USD",
                    security = new
                    {
                        ticker_symbol = holding.TickerSymbol,
                        name = holding.SecurityName,
                        currency = "USD"
                    }
                });
            }

            return new
            {
                version = "2",
                override_accounts = new[]
                {
                    new
                    {
                        type = "investment",
                        subtype = config.AccountSubtype ?? "brokerage",
                        starting_balance = config.StartingBalance > 0 ? config.StartingBalance : totalValue,
                        currency = "USD",
                        identity = new
                        {
                            names = new[] { "Test User" }
                        },
                        investment_transactions = investmentTransactions
                    }
                }
            };
        }

        private static PfmpAccountType MapPlaidSubtypeToAccountType(AccountSubtype? subtype)
        {
            return subtype switch
            {
                // 401k-type accounts
                AccountSubtype._401a => PfmpAccountType.RetirementAccount401k,
                AccountSubtype._401k => PfmpAccountType.RetirementAccount401k,
                AccountSubtype._403b => PfmpAccountType.RetirementAccount401k,
                AccountSubtype.ProfitSharingPlan => PfmpAccountType.RetirementAccount401k,
                AccountSubtype.Sarsep => PfmpAccountType.RetirementAccount401k,
                
                // IRA-type accounts
                AccountSubtype.Ira => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Keogh => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Lira => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Lrif => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Lrsp => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Prif => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Retirement => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Rlif => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Rrif => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Rrsp => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.SepIra => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.SimpleIra => PfmpAccountType.RetirementAccountIRA,
                AccountSubtype.Sipp => PfmpAccountType.RetirementAccountIRA,
                
                // Roth accounts
                AccountSubtype.Roth => PfmpAccountType.RetirementAccountRoth,
                AccountSubtype.Roth401k => PfmpAccountType.RetirementAccountRoth,
                
                // HSA
                AccountSubtype.HealthReimbursementArrangement => PfmpAccountType.HSA,
                AccountSubtype.Hsa => PfmpAccountType.HSA,
                
                // Brokerage/taxable accounts
                AccountSubtype.Brokerage => PfmpAccountType.Brokerage,
                AccountSubtype.CashIsa => PfmpAccountType.Brokerage,
                AccountSubtype.Isa => PfmpAccountType.Brokerage,
                AccountSubtype.MoneyMarket => PfmpAccountType.Brokerage,
                AccountSubtype.MutualFund => PfmpAccountType.Brokerage,
                AccountSubtype.NonTaxableBrokerageAccount => PfmpAccountType.Brokerage,
                AccountSubtype.StockPlan => PfmpAccountType.Brokerage,
                AccountSubtype.Tfsa => PfmpAccountType.Brokerage,
                
                // Other
                _ => PfmpAccountType.Brokerage
            };
        }

        #endregion
    }
}
