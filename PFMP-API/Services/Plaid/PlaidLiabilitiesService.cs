using Going.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Liabilities;
using Going.Plaid.Link;
using Going.Plaid.Transactions;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Services.Plaid
{
    /// <summary>
    /// Result of a liabilities sync operation.
    /// </summary>
    public class LiabilitiesSyncResult
    {
        public bool Success { get; set; }
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        public int CreditCardsUpdated { get; set; }
        public int MortgagesUpdated { get; set; }
        public int StudentLoansUpdated { get; set; }
        public int TransactionsSynced { get; set; }
        public int DurationMs { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Service interface for Plaid Liabilities operations.
    /// </summary>
    public interface IPlaidLiabilitiesService
    {
        /// <summary>
        /// Creates a Plaid Link token for liabilities product.
        /// </summary>
        Task<string> CreateLiabilitiesLinkTokenAsync(int userId);

        /// <summary>
        /// Exchanges a public token for an access token and creates a liabilities connection.
        /// </summary>
        Task<AccountConnection> ExchangeLiabilitiesPublicTokenAsync(
            int userId,
            string publicToken,
            string? institutionId = null,
            string? institutionName = null);

        /// <summary>
        /// Fetches and syncs liabilities from Plaid.
        /// </summary>
        Task<LiabilitiesSyncResult> SyncLiabilitiesAsync(Guid connectionId);

        /// <summary>
        /// Syncs credit card transactions for a connection.
        /// </summary>
        Task<int> SyncCreditCardTransactionsAsync(Guid connectionId);

        /// <summary>
        /// Syncs all liability connections for a user.
        /// </summary>
        Task<LiabilitiesSyncResult> SyncAllUserLiabilitiesAsync(int userId);

        /// <summary>
        /// Gets all Plaid-linked liabilities for a user.
        /// </summary>
        Task<List<LiabilityAccount>> GetUserPlaidLiabilitiesAsync(int userId);

        /// <summary>
        /// Gets transactions for a liability account (credit card).
        /// </summary>
        Task<List<CashTransaction>> GetLiabilityTransactionsAsync(int liabilityAccountId, DateTime? startDate = null, DateTime? endDate = null, int? limit = null);
    }

    /// <summary>
    /// Service for Plaid Liabilities product integration.
    /// Handles credit cards, mortgages, and student loans.
    /// </summary>
    public class PlaidLiabilitiesService : IPlaidLiabilitiesService
    {
        private readonly PlaidClient _plaidClient;
        private readonly ApplicationDbContext _dbContext;
        private readonly ICredentialEncryptionService _encryption;
        private readonly ILogger<PlaidLiabilitiesService> _logger;
        private readonly IConfiguration _configuration;
        private readonly string _clientId;
        private readonly string _secret;

        public PlaidLiabilitiesService(
            ApplicationDbContext dbContext,
            ICredentialEncryptionService encryption,
            ILogger<PlaidLiabilitiesService> logger,
            IConfiguration configuration)
        {
            _dbContext = dbContext;
            _encryption = encryption;
            _logger = logger;
            _configuration = configuration;

            // Load Plaid configuration
            _clientId = configuration["Plaid:ClientId"] ?? throw new InvalidOperationException("Plaid:ClientId not configured");
            _secret = configuration["Plaid:Secret"] ?? throw new InvalidOperationException("Plaid:Secret not configured");
            var envString = configuration["Plaid:Environment"] ?? "sandbox";

            // Determine environment
            var environment = envString.ToLower() switch
            {
                "production" => Going.Plaid.Environment.Production,
                "development" => Going.Plaid.Environment.Development,
                _ => Going.Plaid.Environment.Sandbox
            };

            // Initialize Plaid client
            _plaidClient = new PlaidClient(environment);
        }

        /// <inheritdoc />
        public async Task<string> CreateLiabilitiesLinkTokenAsync(int userId)
        {
            _logger.LogInformation("Creating liabilities link token for user {UserId}", userId);

            var request = new LinkTokenCreateRequest
            {
                ClientId = _clientId,
                Secret = _secret,
                User = new LinkTokenCreateRequestUser { ClientUserId = userId.ToString() },
                ClientName = "PFMP",
                Products = [Products.Liabilities],
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

            _logger.LogInformation("Link token created successfully for user {UserId}", userId);
            return response.LinkToken;
        }

        /// <inheritdoc />
        public async Task<AccountConnection> ExchangeLiabilitiesPublicTokenAsync(
            int userId,
            string publicToken,
            string? institutionId = null,
            string? institutionName = null)
        {
            _logger.LogInformation("Exchanging public token for user {UserId}", userId);

            // Exchange public token for access token
            var exchangeResponse = await _plaidClient.ItemPublicTokenExchangeAsync(
                new Going.Plaid.Item.ItemPublicTokenExchangeRequest 
                { 
                    ClientId = _clientId,
                    Secret = _secret,
                    PublicToken = publicToken 
                });

            if (exchangeResponse.Error != null)
            {
                _logger.LogError("Public token exchange failed: {ErrorCode} - {ErrorMessage}",
                    exchangeResponse.Error.ErrorCode, exchangeResponse.Error.ErrorMessage);
                throw new InvalidOperationException($"Plaid error: {exchangeResponse.Error.ErrorMessage}");
            }

            var accessToken = exchangeResponse.AccessToken;
            var itemId = exchangeResponse.ItemId;

            // Encrypt the access token before storage
            var encryptedToken = _encryption.Encrypt(accessToken);

            // Create account connection
            var connection = new AccountConnection
            {
                UserId = userId,
                PlaidInstitutionId = institutionId,
                PlaidInstitutionName = institutionName ?? "Liabilities Institution",
                PlaidAccessToken = encryptedToken,
                PlaidItemId = itemId,
                Source = AccountSource.PlaidCreditCard, // Default, will be updated based on account types
                Products = "liabilities",
                Status = SyncStatus.Connected,
                ConnectedAt = DateTime.UtcNow,
                LastSyncedAt = DateTime.UtcNow
            };

            _dbContext.AccountConnections.Add(connection);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Created liabilities connection {ConnectionId} for user {UserId}",
                connection.ConnectionId, userId);

            // Perform initial sync
            await SyncLiabilitiesAsync(connection.ConnectionId);

            return connection;
        }

        /// <inheritdoc />
        public async Task<LiabilitiesSyncResult> SyncLiabilitiesAsync(Guid connectionId)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var result = new LiabilitiesSyncResult();

            try
            {
                var connection = await _dbContext.AccountConnections
                    .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);

                if (connection == null)
                {
                    throw new InvalidOperationException($"Connection {connectionId} not found");
                }

                _logger.LogInformation("Syncing liabilities for connection {ConnectionId}", connectionId);

                // Decrypt the access token
                var accessToken = _encryption.Decrypt(connection.PlaidAccessToken!);

                // Fetch liabilities from Plaid
                var liabilitiesResponse = await _plaidClient.LiabilitiesGetAsync(
                    new LiabilitiesGetRequest 
                    { 
                        ClientId = _clientId,
                        Secret = _secret,
                        AccessToken = accessToken 
                    });

                if (liabilitiesResponse.Error != null)
                {
                    throw new InvalidOperationException($"Plaid error: {liabilitiesResponse.Error.ErrorMessage}");
                }

                var accounts = liabilitiesResponse.Accounts;
                var liabilities = liabilitiesResponse.Liabilities;

                // Process credit cards from detailed liability data
                var processedCreditAccountIds = new HashSet<string>();
                if (liabilities.Credit != null)
                {
                    foreach (var creditCard in liabilities.Credit)
                    {
                        await UpsertCreditCardAsync(connection.UserId, connection.PlaidItemId!, creditCard, accounts);
                        if (creditCard.AccountId != null)
                            processedCreditAccountIds.Add(creditCard.AccountId);
                        result.CreditCardsUpdated++;
                    }
                }

                // Also create records for credit-type accounts that Plaid returned
                // but didn't include in the detailed liabilities.Credit array
                var creditAccounts = accounts
                    .Where(a => a.Type == Going.Plaid.Entity.AccountType.Credit
                                && !processedCreditAccountIds.Contains(a.AccountId))
                    .ToList();

                foreach (var creditAccount in creditAccounts)
                {
                    await UpsertCreditCardFromAccountAsync(connection.UserId, connection.PlaidItemId!, creditAccount);
                    result.CreditCardsUpdated++;
                }

                // Process mortgages
                if (liabilities.Mortgage != null)
                {
                    foreach (var mortgage in liabilities.Mortgage)
                    {
                        await UpsertMortgageAsync(connection.UserId, connection.PlaidItemId!, mortgage, accounts);
                        result.MortgagesUpdated++;
                    }
                }

                // Process student loans
                if (liabilities.Student != null)
                {
                    foreach (var studentLoan in liabilities.Student)
                    {
                        await UpsertStudentLoanAsync(connection.UserId, connection.PlaidItemId!, studentLoan, accounts);
                        result.StudentLoansUpdated++;
                    }
                }

                // Update connection sync timestamp
                connection.LastSyncedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                result.Success = true;
                _logger.LogInformation(
                    "Liabilities sync complete: {CreditCards} credit cards, {Mortgages} mortgages, {StudentLoans} student loans",
                    result.CreditCardsUpdated, result.MortgagesUpdated, result.StudentLoansUpdated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing liabilities for connection {ConnectionId}", connectionId);
                result.Success = false;
                result.ErrorMessage = ex.Message;
            }

            stopwatch.Stop();
            result.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            return result;
        }

        /// <inheritdoc />
        public async Task<LiabilitiesSyncResult> SyncAllUserLiabilitiesAsync(int userId)
        {
            var connections = await _dbContext.AccountConnections
                .Where(c => c.UserId == userId &&
                           c.Status == SyncStatus.Connected &&
                           (c.Source == AccountSource.PlaidCreditCard ||
                            c.Source == AccountSource.PlaidMortgage ||
                            c.Source == AccountSource.PlaidStudentLoan ||
                            (c.Products != null && c.Products.Contains("liabilities"))))
                .ToListAsync();

            var aggregateResult = new LiabilitiesSyncResult { Success = true };

            foreach (var connection in connections)
            {
                var result = await SyncLiabilitiesAsync(connection.ConnectionId);
                aggregateResult.CreditCardsUpdated += result.CreditCardsUpdated;
                aggregateResult.MortgagesUpdated += result.MortgagesUpdated;
                aggregateResult.StudentLoansUpdated += result.StudentLoansUpdated;
                aggregateResult.DurationMs += result.DurationMs;

                if (!result.Success)
                {
                    aggregateResult.Success = false;
                    aggregateResult.ErrorMessage = result.ErrorMessage;
                }
            }

            return aggregateResult;
        }

        /// <inheritdoc />
        public async Task<List<LiabilityAccount>> GetUserPlaidLiabilitiesAsync(int userId)
        {
            return await _dbContext.LiabilityAccounts
                .Where(l => l.UserId == userId &&
                           (l.Source == AccountSource.PlaidCreditCard ||
                            l.Source == AccountSource.PlaidMortgage ||
                            l.Source == AccountSource.PlaidStudentLoan))
                .OrderByDescending(l => l.CurrentBalance)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<int> SyncCreditCardTransactionsAsync(Guid connectionId)
        {
            var connection = await _dbContext.AccountConnections
                .FirstOrDefaultAsync(c => c.ConnectionId == connectionId);

            if (connection == null)
            {
                throw new InvalidOperationException($"Connection {connectionId} not found");
            }

            // Get credit card accounts linked to this connection
            // IsCreditCard is a computed property so we must inline the check for EF translation
            var creditCardTypes = new[] { "credit_card", "creditcard", "credit-card" };
            var creditCards = await _dbContext.LiabilityAccounts
                .Where(l => l.PlaidItemId == connection.PlaidItemId &&
                           l.LiabilityType != null && creditCardTypes.Contains(l.LiabilityType.ToLower()) &&
                           l.UserId == connection.UserId)
                .ToListAsync();

            if (!creditCards.Any())
            {
                _logger.LogInformation("No credit cards found for connection {ConnectionId}", connectionId);
                return 0;
            }

            // Build a map of Plaid Account ID to LiabilityAccountId
            var accountIdMap = creditCards
                .Where(c => !string.IsNullOrEmpty(c.PlaidAccountId))
                .ToDictionary(c => c.PlaidAccountId!, c => c.LiabilityAccountId);

            _logger.LogInformation("Syncing transactions for {Count} credit cards on connection {ConnectionId}",
                creditCards.Count, connectionId);

            int totalSynced = 0;

            // Decrypt the access token
            var accessToken = _encryption.Decrypt(connection.PlaidAccessToken!);

            // Use Plaid Transactions Sync API
            var request = new Going.Plaid.Transactions.TransactionsSyncRequest
            {
                ClientId = _clientId,
                Secret = _secret,
                AccessToken = accessToken,
                Cursor = connection.TransactionsCursor
            };

            var response = await _plaidClient.TransactionsSyncAsync(request);

            if (response.Error != null)
            {
                throw new InvalidOperationException($"Plaid error: {response.Error.ErrorMessage}");
            }

            // Process added transactions
            foreach (var txn in response.Added)
            {
                if (!accountIdMap.TryGetValue(txn.AccountId, out var liabilityAccountId))
                {
                    continue; // Not a credit card account we're tracking
                }

                // Check if transaction already exists
                var existing = await _dbContext.CashTransactions
                    .FirstOrDefaultAsync(t => t.PlaidTransactionId == txn.TransactionId);

                if (existing != null)
                {
                    // Update existing transaction
                    MapPlaidTransactionToLiabilityEntity(txn, existing, liabilityAccountId);
                }
                else
                {
                    // Create new transaction
                    var newTxn = new CashTransaction
                    {
                        LiabilityAccountId = liabilityAccountId,
                        PlaidTransactionId = txn.TransactionId,
                        Source = "Plaid"
                    };
                    MapPlaidTransactionToLiabilityEntity(txn, newTxn, liabilityAccountId);
                    _dbContext.CashTransactions.Add(newTxn);
                    totalSynced++;
                }
            }

            // Process modified transactions
            foreach (var txn in response.Modified)
            {
                if (!accountIdMap.TryGetValue(txn.AccountId, out var liabilityAccountId))
                {
                    continue;
                }

                var existing = await _dbContext.CashTransactions
                    .FirstOrDefaultAsync(t => t.PlaidTransactionId == txn.TransactionId);

                if (existing != null)
                {
                    MapPlaidTransactionToLiabilityEntity(txn, existing, liabilityAccountId);
                }
            }

            // Process removed transactions
            foreach (var removed in response.Removed)
            {
                var existing = await _dbContext.CashTransactions
                    .FirstOrDefaultAsync(t => t.PlaidTransactionId == removed.TransactionId);

                if (existing != null && existing.LiabilityAccountId.HasValue)
                {
                    _dbContext.CashTransactions.Remove(existing);
                }
            }

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Synced {Count} credit card transactions for connection {ConnectionId}",
                totalSynced, connectionId);

            return totalSynced;
        }

        /// <inheritdoc />
        public async Task<List<CashTransaction>> GetLiabilityTransactionsAsync(
            int liabilityAccountId,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int? limit = null)
        {
            var query = _dbContext.CashTransactions
                .Where(t => t.LiabilityAccountId == liabilityAccountId);

            if (startDate.HasValue)
                query = query.Where(t => t.TransactionDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(t => t.TransactionDate <= endDate.Value);

            query = query.OrderByDescending(t => t.TransactionDate);

            if (limit.HasValue)
                query = query.Take(limit.Value);

            return await query.ToListAsync();
        }

        private static void MapPlaidTransactionToLiabilityEntity(
            Going.Plaid.Entity.Transaction plaidTxn,
            CashTransaction entity,
            int liabilityAccountId)
        {
            entity.LiabilityAccountId = liabilityAccountId;
            entity.CashAccountId = null;

            // Plaid amounts: positive = money out, negative = money in
            // For credit cards: positive = purchase, negative = payment/refund
            entity.Amount = -(plaidTxn.Amount ?? 0);
            entity.TransactionDate = plaidTxn.Date?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) ?? DateTime.UtcNow;
            entity.Description = plaidTxn.MerchantName ?? plaidTxn.Name ?? "Transaction";
            entity.Merchant = plaidTxn.MerchantName;
            entity.MerchantLogoUrl = plaidTxn.LogoUrl;
            entity.IsPending = plaidTxn.Pending ?? false;
            entity.PaymentChannel = plaidTxn.PaymentChannel?.ToString();
            entity.UpdatedAt = DateTime.UtcNow;

            // Map Plaid category
            if (plaidTxn.PersonalFinanceCategory != null)
            {
                entity.PlaidCategory = plaidTxn.PersonalFinanceCategory.Primary?.ToString();
                entity.PlaidCategoryDetailed = plaidTxn.PersonalFinanceCategory.Detailed?.ToString();
                entity.Category = plaidTxn.PersonalFinanceCategory.Primary?.ToString()?.Replace("_", " ");
            }

            // Determine transaction type based on amount
            if (entity.Amount > 0)
            {
                entity.TransactionType = "Payment"; // Money coming in (payment or refund)
            }
            else
            {
                entity.TransactionType = "Purchase"; // Money going out
            }
        }

        #region Private Helper Methods

        private async Task UpsertCreditCardAsync(
            int userId,
            string itemId,
            CreditCardLiability creditCard,
            IReadOnlyList<Going.Plaid.Entity.Account> accounts)
        {
            var accountId = creditCard.AccountId;
            var account = accounts.FirstOrDefault(a => a.AccountId == accountId);

            var existing = await _dbContext.LiabilityAccounts
                .FirstOrDefaultAsync(l => l.PlaidAccountId == accountId && l.UserId == userId);

            if (existing == null)
            {
                existing = new LiabilityAccount
                {
                    UserId = userId,
                    LiabilityType = "credit_card",
                    Source = AccountSource.PlaidCreditCard,
                    PlaidItemId = itemId,
                    PlaidAccountId = accountId,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.LiabilityAccounts.Add(existing);
            }

            // Update fields from Plaid data
            existing.Lender = account?.Name ?? account?.OfficialName ?? "Credit Card";
            existing.CurrentBalance = (decimal)(account?.Balances?.Current ?? 0);
            existing.CreditLimit = (decimal?)(account?.Balances?.Limit);
            existing.StatementBalance = (decimal?)(creditCard.LastStatementBalance);
            existing.MinimumPayment = (decimal?)(creditCard.MinimumPaymentAmount);
            existing.LastPaymentAmount = (decimal?)(creditCard.LastPaymentAmount);

            // APR - get the purchase APR (use string comparison for API compatibility)
            var purchaseApr = creditCard.Aprs?.FirstOrDefault(a => 
                a.AprType.ToString().Equals("purchase_apr", StringComparison.OrdinalIgnoreCase) ||
                a.AprType.ToString().Equals("PurchaseApr", StringComparison.OrdinalIgnoreCase));
            existing.InterestRateApr = (decimal?)(purchaseApr?.AprPercentage);

            // Due dates
            if (creditCard.NextPaymentDueDate.HasValue)
            {
                existing.NextPaymentDueDate = creditCard.NextPaymentDueDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                existing.PaymentDueDate = existing.NextPaymentDueDate;
                existing.DaysUntilDue = (int)(existing.NextPaymentDueDate.Value - DateTime.UtcNow).TotalDays;
                existing.IsOverdue = existing.DaysUntilDue < 0;
            }

            if (creditCard.LastPaymentDate.HasValue)
            {
                existing.LastPaymentDate = creditCard.LastPaymentDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            if (creditCard.LastStatementIssueDate.HasValue)
            {
                existing.StatementDate = creditCard.LastStatementIssueDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            existing.SyncStatus = "synced";
            existing.LastSyncedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Creates/updates a credit card liability from account-level data only,
        /// when Plaid doesn't return detailed liability info for the account.
        /// </summary>
        private async Task UpsertCreditCardFromAccountAsync(
            int userId,
            string itemId,
            Going.Plaid.Entity.Account account)
        {
            var accountId = account.AccountId;

            var existing = await _dbContext.LiabilityAccounts
                .FirstOrDefaultAsync(l => l.PlaidAccountId == accountId && l.UserId == userId);

            if (existing == null)
            {
                existing = new LiabilityAccount
                {
                    UserId = userId,
                    LiabilityType = "credit_card",
                    Source = AccountSource.PlaidCreditCard,
                    PlaidItemId = itemId,
                    PlaidAccountId = accountId,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.LiabilityAccounts.Add(existing);
            }

            existing.Lender = account.Name ?? account.OfficialName ?? "Credit Card";
            existing.CurrentBalance = (decimal)(account.Balances?.Current ?? 0);
            existing.CreditLimit = (decimal?)(account.Balances?.Limit);
            existing.SyncStatus = "synced";
            existing.LastSyncedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Upserted credit card from account data: {AccountName} (balance: {Balance})",
                existing.Lender, existing.CurrentBalance);

            await _dbContext.SaveChangesAsync();
        }

        private async Task UpsertMortgageAsync(
            int userId,
            string itemId,
            MortgageLiability mortgage,
            IReadOnlyList<Going.Plaid.Entity.Account> accounts)
        {
            var accountId = mortgage.AccountId;
            var account = accounts.FirstOrDefault(a => a.AccountId == accountId);

            var existing = await _dbContext.LiabilityAccounts
                .FirstOrDefaultAsync(l => l.PlaidAccountId == accountId && l.UserId == userId);

            if (existing == null)
            {
                existing = new LiabilityAccount
                {
                    UserId = userId,
                    LiabilityType = "mortgage",
                    Source = AccountSource.PlaidMortgage,
                    PlaidItemId = itemId,
                    PlaidAccountId = accountId,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.LiabilityAccounts.Add(existing);
            }

            // Update fields from Plaid data
            existing.Lender = account?.Name ?? account?.OfficialName ?? "Mortgage";
            existing.CurrentBalance = (decimal)(account?.Balances?.Current ?? 0);
            existing.OriginalLoanAmount = (decimal?)(mortgage.OriginationPrincipalAmount);
            existing.InterestRateApr = (decimal?)(mortgage.InterestRate?.Percentage);
            existing.MinimumPayment = (decimal?)(mortgage.NextMonthlyPayment);
            existing.LoanTermMonths = ParseLoanTermToMonths(mortgage.LoanTerm);

            if (mortgage.OriginationDate.HasValue)
            {
                existing.LoanStartDate = mortgage.OriginationDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            // Due dates
            if (mortgage.NextPaymentDueDate.HasValue)
            {
                existing.NextPaymentDueDate = mortgage.NextPaymentDueDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                existing.PaymentDueDate = existing.NextPaymentDueDate;
                existing.DaysUntilDue = (int)(existing.NextPaymentDueDate.Value - DateTime.UtcNow).TotalDays;
                existing.IsOverdue = existing.DaysUntilDue < 0;
            }

            if (mortgage.LastPaymentDate.HasValue)
            {
                existing.LastPaymentDate = mortgage.LastPaymentDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            existing.LastPaymentAmount = (decimal?)(mortgage.LastPaymentAmount);

            // YTD amounts
            existing.YtdInterestPaid = (decimal?)(mortgage.YtdInterestPaid);
            existing.YtdPrincipalPaid = (decimal?)(mortgage.YtdPrincipalPaid);
            existing.EscrowBalance = (decimal?)(mortgage.EscrowBalance);

            existing.SyncStatus = "synced";
            existing.LastSyncedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // Create or update linked property if address available
            if (mortgage.PropertyAddress != null)
            {
                await UpsertPropertyFromMortgageAsync(userId, existing.LiabilityAccountId, mortgage.PropertyAddress, existing.CurrentBalance);
            }
        }

        private async Task UpsertStudentLoanAsync(
            int userId,
            string itemId,
            StudentLoan studentLoan,
            IReadOnlyList<Going.Plaid.Entity.Account> accounts)
        {
            var accountId = studentLoan.AccountId;
            var account = accounts.FirstOrDefault(a => a.AccountId == accountId);

            var existing = await _dbContext.LiabilityAccounts
                .FirstOrDefaultAsync(l => l.PlaidAccountId == accountId && l.UserId == userId);

            if (existing == null)
            {
                existing = new LiabilityAccount
                {
                    UserId = userId,
                    LiabilityType = "student_loan",
                    Source = AccountSource.PlaidStudentLoan,
                    PlaidItemId = itemId,
                    PlaidAccountId = accountId,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.LiabilityAccounts.Add(existing);
            }

            // Update fields from Plaid data
            existing.Lender = studentLoan.LoanName ?? account?.Name ?? account?.OfficialName ?? "Student Loan";
            existing.CurrentBalance = (decimal)(account?.Balances?.Current ?? 0);
            existing.OriginalLoanAmount = (decimal?)(studentLoan.OriginationPrincipalAmount);
            existing.InterestRateApr = (decimal?)(studentLoan.InterestRatePercentage);
            existing.MinimumPayment = (decimal?)(studentLoan.MinimumPaymentAmount);
            existing.LoanTermMonths = studentLoan.ExpectedPayoffDate.HasValue && studentLoan.OriginationDate.HasValue
                ? (int)((studentLoan.ExpectedPayoffDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) -
                         studentLoan.OriginationDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)).TotalDays / 30.44)
                : null;

            if (studentLoan.OriginationDate.HasValue)
            {
                existing.LoanStartDate = studentLoan.OriginationDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            if (studentLoan.ExpectedPayoffDate.HasValue)
            {
                existing.PayoffTargetDate = studentLoan.ExpectedPayoffDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            // Due dates
            if (studentLoan.NextPaymentDueDate.HasValue)
            {
                existing.NextPaymentDueDate = studentLoan.NextPaymentDueDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                existing.PaymentDueDate = existing.NextPaymentDueDate;
                existing.DaysUntilDue = (int)(existing.NextPaymentDueDate.Value - DateTime.UtcNow).TotalDays;
                existing.IsOverdue = existing.DaysUntilDue < 0;
            }

            if (studentLoan.LastPaymentDate.HasValue)
            {
                existing.LastPaymentDate = studentLoan.LastPaymentDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            }

            existing.LastPaymentAmount = (decimal?)(studentLoan.LastPaymentAmount);
            existing.YtdInterestPaid = (decimal?)(studentLoan.YtdInterestPaid);
            existing.YtdPrincipalPaid = (decimal?)(studentLoan.YtdPrincipalPaid);

            existing.SyncStatus = "synced";
            existing.LastSyncedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
        }

        private async Task UpsertPropertyFromMortgageAsync(
            int userId,
            int liabilityAccountId,
            MortgagePropertyAddress address,
            decimal mortgageBalance)
        {
            // Look for existing property linked to this mortgage
            var existing = await _dbContext.Properties
                .FirstOrDefaultAsync(p => p.LinkedMortgageLiabilityId == liabilityAccountId && p.UserId == userId);

            if (existing == null)
            {
                // Also check by address match
                existing = await _dbContext.Properties
                    .FirstOrDefaultAsync(p => p.UserId == userId &&
                                             p.Street == address.Street &&
                                             p.City == address.City &&
                                             p.PostalCode == address.PostalCode);
            }

            if (existing == null)
            {
                existing = new PropertyProfile
                {
                    UserId = userId,
                    PropertyName = $"{address.Street ?? "Property"}, {address.City ?? ""}".Trim(',', ' '),
                    PropertyType = "primary",
                    Source = AccountSource.PlaidMortgage,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.Properties.Add(existing);
            }

            // Update from Plaid data
            existing.LinkedMortgageLiabilityId = liabilityAccountId;
            existing.Street = address.Street;
            existing.City = address.City;
            existing.State = address.Region;
            existing.PostalCode = address.PostalCode;
            existing.MortgageBalance = mortgageBalance;
            existing.Source = AccountSource.PlaidMortgage;
            existing.SyncStatus = "synced";
            existing.LastSyncedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Parses loan term strings like "30 year", "15 years", "360 months" to months.
        /// </summary>
        private static int? ParseLoanTermToMonths(string? loanTerm)
        {
            if (string.IsNullOrWhiteSpace(loanTerm))
                return null;

            var term = loanTerm.Trim().ToLowerInvariant();
            
            // Extract numeric value
            var numericPart = new string(term.TakeWhile(c => char.IsDigit(c)).ToArray());
            if (!int.TryParse(numericPart, out var value))
                return null;

            // Check for year/years variants and convert to months
            if (term.Contains("year"))
                return value * 12;

            // Check for month/months
            if (term.Contains("month"))
                return value;

            // Assume raw number is months if no unit specified
            return value;
        }

        #endregion
    }
}
