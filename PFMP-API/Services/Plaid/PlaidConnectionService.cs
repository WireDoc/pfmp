using Going.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Link;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Plaid;
using System.Text.Json;

namespace PFMP_API.Services.Plaid
{
    /// <summary>
    /// Result of a unified Plaid connection operation.
    /// </summary>
    public class UnifiedConnectionResult
    {
        public bool Success { get; set; }
        public Guid ConnectionId { get; set; }
        public string? InstitutionName { get; set; }
        public List<string> EnabledProducts { get; set; } = [];
        public int AccountsLinked { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Service interface for unified Plaid connection operations.
    /// Orchestrates linking across all Plaid products (transactions, investments, liabilities).
    /// </summary>
    public interface IPlaidConnectionService
    {
        /// <summary>
        /// Creates a unified Link token that can request multiple products at once.
        /// </summary>
        Task<string> CreateUnifiedLinkTokenAsync(int userId, List<string>? products = null);

        /// <summary>
        /// Exchanges a public token and creates a unified connection.
        /// Detects which products are available and syncs accordingly.
        /// </summary>
        Task<UnifiedConnectionResult> ExchangeUnifiedPublicTokenAsync(
            int userId,
            string publicToken,
            string? institutionId = null,
            string? institutionName = null,
            List<string>? requestedProducts = null);

        /// <summary>
        /// Syncs all data for a unified connection (transactions, investments, liabilities).
        /// </summary>
        Task<UnifiedSyncResult> SyncUnifiedConnectionAsync(Guid connectionId);

        /// <summary>
        /// Gets all connections for a user with product availability info.
        /// </summary>
        Task<List<ConnectionInfo>> GetUserConnectionsAsync(int userId);

        /// <summary>
        /// Updates the products array for an existing connection (e.g., when adding liabilities to a bank connection).
        /// </summary>
        Task<AccountConnection> UpdateConnectionProductsAsync(Guid connectionId, List<string> products);
    }

    /// <summary>
    /// Result of syncing all products for a unified connection.
    /// </summary>
    public class UnifiedSyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int DurationMs { get; set; }
        public bool TransactionsSynced { get; set; }
        public int TransactionsCount { get; set; }
        public bool InvestmentsSynced { get; set; }
        public int HoldingsCount { get; set; }
        public bool LiabilitiesSynced { get; set; }
        public int LiabilitiesCount { get; set; }
        public List<string> Errors { get; set; } = [];
    }

    /// <summary>
    /// Info about a user's Plaid connection.
    /// </summary>
    public class ConnectionInfo
    {
        public Guid ConnectionId { get; set; }
        public string? InstitutionId { get; set; }
        public string? InstitutionName { get; set; }
        public AccountSource Source { get; set; }
        public List<string> Products { get; set; } = [];
        public bool IsUnified { get; set; }
        public SyncStatus Status { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public DateTime ConnectedAt { get; set; }
    }

    /// <summary>
    /// Orchestrates unified Plaid connections across all products.
    /// </summary>
    public class PlaidConnectionService : IPlaidConnectionService
    {
        private readonly PlaidClient _plaidClient;
        private readonly ApplicationDbContext _dbContext;
        private readonly IPlaidService _plaidService;
        private readonly IPlaidInvestmentsService _investmentsService;
        private readonly IPlaidLiabilitiesService _liabilitiesService;
        private readonly ILogger<PlaidConnectionService> _logger;

        // Supported products for unified linking
        private static readonly List<string> AllProducts = ["transactions", "investments", "liabilities"];

        public PlaidConnectionService(
            PlaidClient plaidClient,
            ApplicationDbContext dbContext,
            IPlaidService plaidService,
            IPlaidInvestmentsService investmentsService,
            IPlaidLiabilitiesService liabilitiesService,
            ILogger<PlaidConnectionService> logger)
        {
            _plaidClient = plaidClient;
            _dbContext = dbContext;
            _plaidService = plaidService;
            _investmentsService = investmentsService;
            _liabilitiesService = liabilitiesService;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<string> CreateUnifiedLinkTokenAsync(int userId, List<string>? products = null)
        {
            _logger.LogInformation("Creating unified link token for user {UserId} with products: {Products}",
                userId, products != null ? string.Join(", ", products) : "default");

            // Map product strings to Plaid enum
            var plaidProducts = new List<Products>();
            var requestedProducts = products ?? AllProducts;

            foreach (var product in requestedProducts)
            {
                switch (product.ToLowerInvariant())
                {
                    case "transactions":
                        plaidProducts.Add(Going.Plaid.Entity.Products.Transactions);
                        break;
                    case "investments":
                        plaidProducts.Add(Going.Plaid.Entity.Products.Investments);
                        break;
                    case "liabilities":
                        plaidProducts.Add(Going.Plaid.Entity.Products.Liabilities);
                        break;
                }
            }

            if (plaidProducts.Count == 0)
            {
                plaidProducts.Add(Going.Plaid.Entity.Products.Transactions); // Default
            }

            var request = new LinkTokenCreateRequest
            {
                User = new LinkTokenCreateRequestUser { ClientUserId = userId.ToString() },
                ClientName = "PFMP",
                Products = plaidProducts,
                CountryCodes = [CountryCode.Us],
                Language = Language.English
            };

            var response = await _plaidClient.LinkTokenCreateAsync(request);

            if (response.Error != null)
            {
                _logger.LogError("Plaid Link token creation failed: {ErrorCode} - {ErrorMessage}",
                    response.Error.ErrorCode, response.Error.ErrorMessage);
                throw new InvalidOperationException($"Plaid error: {response.Error.ErrorMessage}");
            }

            _logger.LogInformation("Unified link token created for user {UserId}", userId);
            return response.LinkToken;
        }

        /// <inheritdoc />
        public async Task<UnifiedConnectionResult> ExchangeUnifiedPublicTokenAsync(
            int userId,
            string publicToken,
            string? institutionId = null,
            string? institutionName = null,
            List<string>? requestedProducts = null)
        {
            var result = new UnifiedConnectionResult();

            try
            {
                _logger.LogInformation("Exchanging unified public token for user {UserId}", userId);

                // Exchange public token for access token
                var exchangeResponse = await _plaidClient.ItemPublicTokenExchangeAsync(
                    new Going.Plaid.Item.ItemPublicTokenExchangeRequest { PublicToken = publicToken });

                if (exchangeResponse.Error != null)
                {
                    throw new InvalidOperationException($"Plaid error: {exchangeResponse.Error.ErrorMessage}");
                }

                var accessToken = exchangeResponse.AccessToken;
                var itemId = exchangeResponse.ItemId;

                // Determine account source based on primary product
                var source = DetermineAccountSource(requestedProducts);
                var productsJson = requestedProducts != null ? JsonSerializer.Serialize(requestedProducts) : null;

                // Create unified connection
                var connection = new AccountConnection
                {
                    UserId = userId,
                    PlaidInstitutionId = institutionId,
                    PlaidInstitutionName = institutionName ?? "Financial Institution",
                    PlaidAccessToken = accessToken,
                    PlaidItemId = itemId,
                    Source = source,
                    Products = productsJson,
                    IsUnified = true,
                    Status = SyncStatus.Connected,
                    ConnectedAt = DateTime.UtcNow,
                    LastSyncedAt = DateTime.UtcNow
                };

                _dbContext.AccountConnections.Add(connection);
                await _dbContext.SaveChangesAsync();

                result.ConnectionId = connection.ConnectionId;
                result.InstitutionName = institutionName;
                result.EnabledProducts = requestedProducts ?? [];

                _logger.LogInformation("Created unified connection {ConnectionId} for user {UserId}",
                    connection.ConnectionId, userId);

                // Perform initial sync for all requested products
                var syncResult = await SyncUnifiedConnectionAsync(connection.ConnectionId);
                result.AccountsLinked = syncResult.TransactionsCount + syncResult.HoldingsCount + syncResult.LiabilitiesCount;
                result.Success = syncResult.Success;

                if (syncResult.Errors.Count > 0)
                {
                    result.ErrorMessage = string.Join("; ", syncResult.Errors);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging unified public token for user {UserId}", userId);
                result.Success = false;
                result.ErrorMessage = ex.Message;
            }

            return result;
        }

        /// <inheritdoc />
        public async Task<UnifiedSyncResult> SyncUnifiedConnectionAsync(Guid connectionId)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var result = new UnifiedSyncResult();

            try
            {
                var connection = await _dbContext.AccountConnections
                    .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);

                if (connection == null)
                {
                    throw new InvalidOperationException($"Connection {connectionId} not found");
                }

                var products = ParseProducts(connection.Products);

                _logger.LogInformation("Syncing unified connection {ConnectionId} with products: {Products}",
                    connectionId, string.Join(", ", products));

                // Sync transactions if enabled
                if (products.Contains("transactions"))
                {
                    try
                    {
                        var txResult = await _plaidService.SyncTransactionsAsync(connectionId);
                        result.TransactionsSynced = txResult.Success;
                        result.TransactionsCount = txResult.TransactionsAdded;
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Transactions: {ex.Message}");
                    }
                }

                // Sync investments if enabled
                if (products.Contains("investments"))
                {
                    try
                    {
                        var invResult = await _investmentsService.SyncInvestmentHoldingsAsync(connectionId);
                        result.InvestmentsSynced = invResult.Success;
                        result.HoldingsCount = invResult.HoldingsUpdated;
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Investments: {ex.Message}");
                    }
                }

                // Sync liabilities if enabled
                if (products.Contains("liabilities"))
                {
                    try
                    {
                        var liabResult = await _liabilitiesService.SyncLiabilitiesAsync(connectionId);
                        result.LiabilitiesSynced = liabResult.Success;
                        result.LiabilitiesCount = liabResult.CreditCardsUpdated + liabResult.MortgagesUpdated + liabResult.StudentLoansUpdated;
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Liabilities: {ex.Message}");
                    }
                }

                // Update connection sync timestamp
                connection.LastSyncedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                result.Success = result.Errors.Count == 0;

                _logger.LogInformation(
                    "Unified sync complete for {ConnectionId}: Tx={TxCount}, Holdings={Holdings}, Liabilities={Liab}",
                    connectionId, result.TransactionsCount, result.HoldingsCount, result.LiabilitiesCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing unified connection {ConnectionId}", connectionId);
                result.Success = false;
                result.Errors.Add(ex.Message);
            }

            stopwatch.Stop();
            result.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            return result;
        }

        /// <inheritdoc />
        public async Task<List<ConnectionInfo>> GetUserConnectionsAsync(int userId)
        {
            var connections = await _dbContext.AccountConnections
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.ConnectedAt)
                .ToListAsync();

            return connections.Select(c => new ConnectionInfo
            {
                ConnectionId = c.ConnectionId,
                InstitutionId = c.PlaidInstitutionId,
                InstitutionName = c.PlaidInstitutionName,
                Source = c.Source,
                Products = ParseProducts(c.Products),
                IsUnified = c.IsUnified,
                Status = c.Status,
                LastSyncedAt = c.LastSyncedAt,
                ConnectedAt = c.ConnectedAt
            }).ToList();
        }

        /// <inheritdoc />
        public async Task<AccountConnection> UpdateConnectionProductsAsync(Guid connectionId, List<string> products)
        {
            var connection = await _dbContext.AccountConnections
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);

            if (connection == null)
            {
                throw new InvalidOperationException($"Connection {connectionId} not found");
            }

            connection.Products = JsonSerializer.Serialize(products);
            connection.IsUnified = true; // Mark as unified when products are updated
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Updated products for connection {ConnectionId}: {Products}",
                connectionId, string.Join(", ", products));

            return connection;
        }

        #region Private Helpers

        private static AccountSource DetermineAccountSource(List<string>? products)
        {
            if (products == null || products.Count == 0)
                return AccountSource.Plaid;

            // Prioritize by product type
            if (products.Contains("investments"))
                return AccountSource.PlaidInvestments;
            if (products.Contains("liabilities"))
                return AccountSource.PlaidCreditCard; // Could be refined based on account types
            return AccountSource.Plaid;
        }

        private static List<string> ParseProducts(string? productsJson)
        {
            if (string.IsNullOrEmpty(productsJson))
                return ["transactions"]; // Default

            try
            {
                return JsonSerializer.Deserialize<List<string>>(productsJson) ?? ["transactions"];
            }
            catch
            {
                // Handle comma-separated format
                return productsJson.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .ToList();
            }
        }

        #endregion
    }
}
