using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Plaid;
using PFMP_API.Services.Plaid;

namespace PFMP_API.Controllers;

/// <summary>
/// Controller for Plaid integration - bank account linking and balance sync
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PlaidController : ControllerBase
{
    private readonly IPlaidService _plaidService;
    private readonly ILogger<PlaidController> _logger;
    private readonly ApplicationDbContext _db;

    public PlaidController(IPlaidService plaidService, ILogger<PlaidController> logger, ApplicationDbContext db)
    {
        _plaidService = plaidService;
        _logger = logger;
        _db = db;
    }

    /// <summary>
    /// Generate a Plaid Link token for the frontend to initialize Plaid Link
    /// </summary>
    /// <returns>Link token for Plaid Link initialization</returns>
    [HttpPost("link-token")]
    [ProducesResponseType(typeof(LinkTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LinkTokenResponse>> CreateLinkToken([FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            _logger.LogInformation("Creating Plaid Link token for user {UserId}", userId);
            var linkToken = await _plaidService.CreateLinkTokenAsync(userId);
            
            return Ok(new LinkTokenResponse { LinkToken = linkToken });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Plaid Link token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to create link token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exchange a Plaid public token for an access token and create the connection
    /// </summary>
    /// <param name="request">The public token from Plaid Link</param>
    /// <param name="userId">The user ID</param>
    /// <returns>The created account connection with linked accounts</returns>
    [HttpPost("exchange-token")]
    [ProducesResponseType(typeof(ExchangeTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ExchangeTokenResponse>> ExchangePublicToken([FromBody] ExchangeTokenRequest request, [FromQuery] int userId)
    {
        if (string.IsNullOrWhiteSpace(request.PublicToken))
        {
            return BadRequest(new ErrorResponse { Error = "Public token is required" });
        }

        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            _logger.LogInformation("Exchanging Plaid public token for user {UserId}, institution: {Institution}", userId, request.InstitutionName);
            var connection = await _plaidService.ExchangePublicTokenAsync(userId, request.PublicToken, request.InstitutionId, request.InstitutionName);
            
            // Get the accounts that were created
            var accounts = await _plaidService.GetConnectionAccountsAsync(connection.ConnectionId);
            
            return Ok(new ExchangeTokenResponse
            {
                Connection = MapToConnectionDto(connection),
                Accounts = accounts.Select(a => new AccountDto
                {
                    CashAccountId = a.CashAccountId,
                    Name = a.Nickname,
                    Balance = a.Balance,
                    PlaidAccountId = a.PlaidAccountId,
                    SyncStatus = a.SyncStatus.ToString(),
                    LastSyncedAt = a.LastSyncedAt
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to exchange Plaid public token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to exchange token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get all Plaid connections for the specified user
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>List of account connections</returns>
    [HttpGet("connections")]
    [ProducesResponseType(typeof(List<ConnectionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ConnectionDto>>> GetConnections([FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            return Ok(connections.Select(MapToConnectionDto).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get connections for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get connections", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get accounts for a specific connection
    /// </summary>
    /// <param name="connectionId">The connection ID</param>
    /// <param name="userId">The user ID</param>
    /// <returns>List of accounts linked to this connection</returns>
    [HttpGet("connections/{connectionId}/accounts")]
    [ProducesResponseType(typeof(List<AccountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<AccountDto>>> GetConnectionAccounts(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            var connection = connections.FirstOrDefault(c => c.ConnectionId == connectionId);
            if (connection == null)
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            var result = new List<AccountDto>();

            // Check if this is an investment connection (PlaidInvestments source)
            if (connection.Source == AccountSource.PlaidInvestments)
            {
                // Query investment accounts from the Accounts table
                var investmentAccounts = await _db.Accounts
                    .Where(a => a.ConnectionId == connectionId && a.UserId == userId)
                    .OrderBy(a => a.AccountName)
                    .ToListAsync();

                result.AddRange(investmentAccounts.Select(a => new AccountDto
                {
                    CashAccountId = Guid.Empty, // Not a CashAccount
                    AccountId = a.AccountId,
                    Name = a.AccountName,
                    Balance = a.CurrentBalance,
                    PlaidAccountId = a.PlaidAccountId,
                    SyncStatus = a.PlaidSyncStatus.ToString(),
                    LastSyncedAt = a.PlaidLastSyncedAt
                }));
            }
            else
            {
                // Query bank accounts from the CashAccounts table
                var accounts = await _plaidService.GetConnectionAccountsAsync(connectionId);
                result.AddRange(accounts.Select(a => new AccountDto
                {
                    CashAccountId = a.CashAccountId,
                    Name = a.Nickname,
                    Balance = a.Balance,
                    PlaidAccountId = a.PlaidAccountId,
                    SyncStatus = a.SyncStatus.ToString(),
                    LastSyncedAt = a.LastSyncedAt
                }));
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get accounts for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get accounts", Details = ex.Message });
        }
    }

    /// <summary>
    /// Manually trigger a sync for a specific connection
    /// </summary>
    /// <param name="connectionId">The connection ID to sync</param>
    /// <param name="userId">The user ID</param>
    /// <returns>Sync result with updated accounts</returns>
    [HttpPost("connections/{connectionId}/sync")]
    [ProducesResponseType(typeof(SyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SyncResultDto>> SyncConnection(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Manual sync triggered for connection {ConnectionId}", connectionId);
            var result = await _plaidService.SyncConnectionAsync(connectionId);
            
            return Ok(new SyncResultDto
            {
                Success = result.Success,
                AccountsUpdated = result.AccountsUpdated,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to sync connection", Details = ex.Message });
        }
    }

    /// <summary>
    /// Sync all connections for the specified user
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>Aggregate sync result</returns>
    [HttpPost("sync-all")]
    [ProducesResponseType(typeof(SyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SyncResultDto>> SyncAllConnections([FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            _logger.LogInformation("Manual sync-all triggered for user {UserId}", userId);
            var result = await _plaidService.SyncAllUserConnectionsAsync(userId);
            
            return Ok(new SyncResultDto
            {
                Success = result.Success,
                AccountsUpdated = result.AccountsUpdated,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync all connections for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to sync connections", Details = ex.Message });
        }
    }

    /// <summary>
    /// Disconnect (remove) a Plaid connection
    /// </summary>
    /// <param name="connectionId">The connection ID to disconnect</param>
    /// <param name="userId">The user ID</param>
    /// <returns>No content on success</returns>
    [HttpDelete("connections/{connectionId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DisconnectConnection(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Disconnecting connection {ConnectionId} for user {UserId}", connectionId, userId);
            await _plaidService.DisconnectAsync(connectionId);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to disconnect connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to disconnect", Details = ex.Message });
        }
    }

    /// <summary>
    /// Create a link token for reconnecting a disconnected connection (update mode)
    /// </summary>
    /// <param name="connectionId">The connection ID to reconnect</param>
    /// <param name="userId">The user ID</param>
    /// <returns>Link token for update mode</returns>
    [HttpPost("connections/{connectionId}/reconnect")]
    [ProducesResponseType(typeof(LinkTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LinkTokenResponse>> CreateReconnectLinkToken(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            var connection = connections.FirstOrDefault(c => c.ConnectionId == connectionId);
            if (connection == null)
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Creating reconnect link token for connection {ConnectionId}", connectionId);
            var linkToken = await _plaidService.CreateReconnectLinkTokenAsync(connectionId);
            
            return Ok(new LinkTokenResponse { LinkToken = linkToken });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Cannot reconnect connection {ConnectionId}", connectionId);
            return BadRequest(new ErrorResponse { Error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create reconnect link token for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to create reconnect token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Mark a connection as successfully reconnected (after user completes update mode Link)
    /// </summary>
    /// <param name="connectionId">The connection ID that was reconnected</param>
    /// <param name="userId">The user ID</param>
    /// <returns>Updated connection info</returns>
    [HttpPost("connections/{connectionId}/reconnect-success")]
    [ProducesResponseType(typeof(ConnectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ConnectionDto>> ReconnectSuccess(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Marking connection {ConnectionId} as reconnected", connectionId);
            await _plaidService.ReconnectSuccessAsync(connectionId);
            
            // Get updated connection
            var updatedConnections = await _plaidService.GetUserConnectionsAsync(userId);
            var updated = updatedConnections.First(c => c.ConnectionId == connectionId);
            
            return Ok(MapToConnectionDto(updated));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to complete reconnection for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to complete reconnection", Details = ex.Message });
        }
    }

    /// <summary>
    /// Permanently delete a connection and optionally its linked accounts
    /// </summary>
    /// <param name="connectionId">The connection ID to delete</param>
    /// <param name="userId">The user ID</param>
    /// <param name="deleteAccounts">If true, delete linked accounts; if false, convert them to manual accounts</param>
    /// <returns>No content on success</returns>
    [HttpDelete("connections/{connectionId}/permanent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteConnectionPermanently(Guid connectionId, [FromQuery] int userId, [FromQuery] bool deleteAccounts = false)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Permanently deleting connection {ConnectionId}, deleteAccounts={DeleteAccounts}", connectionId, deleteAccounts);
            await _plaidService.DeleteConnectionAsync(connectionId, deleteAccounts);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to permanently delete connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to delete connection", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get sync history for a specific connection
    /// </summary>
    /// <param name="connectionId">The connection ID</param>
    /// <param name="userId">The user ID</param>
    /// <param name="limit">Maximum number of history entries to return (default 10)</param>
    /// <returns>List of sync history entries</returns>
    [HttpGet("connections/{connectionId}/history")]
    [ProducesResponseType(typeof(List<SyncHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<SyncHistoryDto>>> GetSyncHistory(Guid connectionId, [FromQuery] int userId, [FromQuery] int limit = 10)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            var history = await _plaidService.GetSyncHistoryAsync(connectionId, limit);
            return Ok(history.Select(h => new SyncHistoryDto
            {
                SyncHistoryId = h.SyncHistoryId,
                SyncStartedAt = h.SyncStartedAt,
                SyncCompletedAt = h.SyncCompletedAt,
                Status = h.Status.ToString(),
                ErrorMessage = h.ErrorMessage,
                AccountsUpdated = h.AccountsUpdated,
                DurationMs = h.DurationMs
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get sync history for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get sync history", Details = ex.Message });
        }
    }

    private static ConnectionDto MapToConnectionDto(AccountConnection connection)
    {
        return new ConnectionDto
        {
            ConnectionId = connection.ConnectionId,
            InstitutionName = connection.PlaidInstitutionName,
            InstitutionId = connection.PlaidInstitutionId,
            Status = connection.Status.ToString(),
            ErrorMessage = connection.ErrorMessage,
            ConnectedAt = connection.ConnectedAt,
            LastSyncedAt = connection.LastSyncedAt,
            Source = connection.Source.ToString()
        };
    }

    /// <summary>
    /// Sync transactions for a specific connection using Plaid's incremental sync
    /// </summary>
    /// <param name="connectionId">The connection ID to sync transactions for</param>
    /// <param name="userId">The user ID for authorization</param>
    /// <returns>Sync result with transaction counts</returns>
    [HttpPost("connections/{connectionId}/transactions/sync")]
    [ProducesResponseType(typeof(TransactionSyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<TransactionSyncResultDto>> SyncTransactions(Guid connectionId, [FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            _logger.LogInformation("Syncing transactions for connection {ConnectionId}, user {UserId}", connectionId, userId);
            var result = await _plaidService.SyncTransactionsAsync(connectionId);

            return Ok(new TransactionSyncResultDto
            {
                Success = result.Success,
                TransactionsAdded = result.TransactionsAdded,
                TransactionsModified = result.TransactionsModified,
                TransactionsRemoved = result.TransactionsRemoved,
                HasMore = result.HasMore,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync transactions for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to sync transactions", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get transactions for a specific connection
    /// </summary>
    /// <param name="connectionId">The connection ID to get transactions for</param>
    /// <param name="userId">The user ID for authorization</param>
    /// <param name="startDate">Optional start date filter</param>
    /// <param name="endDate">Optional end date filter</param>
    /// <param name="limit">Maximum number of transactions to return (default 100)</param>
    /// <returns>List of transactions</returns>
    [HttpGet("connections/{connectionId}/transactions")]
    [ProducesResponseType(typeof(List<TransactionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<TransactionDto>>> GetConnectionTransactions(
        Guid connectionId,
        [FromQuery] int userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 100)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId);
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            var transactions = await _plaidService.GetConnectionTransactionsAsync(connectionId, startDate, endDate, limit);

            return Ok(transactions.Select(t => new TransactionDto
            {
                TransactionId = t.CashTransactionId,
                CashAccountId = t.CashAccountId,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                Description = t.Description,
                Category = t.Category,
                TransactionType = t.TransactionType,
                PlaidTransactionId = t.PlaidTransactionId,
                PlaidCategory = t.PlaidCategory,
                PlaidCategoryDetailed = t.PlaidCategoryDetailed,
                PaymentChannel = t.PaymentChannel,
                MerchantLogoUrl = t.MerchantLogoUrl,
                Source = t.Source
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get transactions for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get transactions", Details = ex.Message });
        }
    }

    #region Investments Endpoints (Wave 12)

    /// <summary>
    /// Generate a Plaid Link token for investments product
    /// </summary>
    [HttpPost("investments/link-token")]
    [ProducesResponseType(typeof(LinkTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LinkTokenResponse>> CreateInvestmentsLinkToken(
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest("Valid user ID is required");
        }

        try
        {
            _logger.LogInformation("Creating Plaid Investments Link token for user {UserId}", userId);
            var linkToken = await investmentsService.CreateInvestmentsLinkTokenAsync(userId);
            
            return Ok(new LinkTokenResponse { LinkToken = linkToken });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Plaid Investments Link token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to create investments link token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exchange a Plaid public token for investments and create the connection
    /// </summary>
    [HttpPost("investments/exchange-token")]
    [ProducesResponseType(typeof(InvestmentsExchangeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<InvestmentsExchangeResponse>> ExchangeInvestmentsPublicToken(
        [FromBody] ExchangeTokenRequest request,
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (string.IsNullOrWhiteSpace(request.PublicToken))
        {
            return BadRequest(new ErrorResponse { Error = "Public token is required" });
        }

        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            _logger.LogInformation("Exchanging Plaid investments public token for user {UserId}", userId);
            var connection = await investmentsService.ExchangeInvestmentsPublicTokenAsync(
                userId, request.PublicToken, request.InstitutionId, request.InstitutionName);
            
            var accounts = await investmentsService.GetUserInvestmentAccountsAsync(userId);
            
            return Ok(new InvestmentsExchangeResponse
            {
                Connection = MapToConnectionDto(connection),
                AccountsCreated = accounts.Count(a => a.ConnectionId == connection.ConnectionId)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to exchange Plaid investments public token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to exchange investments token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Sync investment holdings for a connection
    /// </summary>
    [HttpPost("investments/connections/{connectionId}/sync")]
    [ProducesResponseType(typeof(InvestmentsSyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<InvestmentsSyncResultDto>> SyncInvestmentHoldings(
        Guid connectionId,
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            var result = await investmentsService.SyncInvestmentHoldingsAsync(connectionId);
            
            return Ok(new InvestmentsSyncResultDto
            {
                Success = result.Success,
                AccountsUpdated = result.AccountsUpdated,
                HoldingsUpdated = result.HoldingsUpdated,
                SecuritiesUpdated = result.SecuritiesUpdated,
                DurationMs = result.DurationMs,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync investment holdings for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to sync investments", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get investment accounts for a user
    /// </summary>
    [HttpGet("investments/accounts")]
    [ProducesResponseType(typeof(List<InvestmentAccountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<InvestmentAccountDto>>> GetInvestmentAccounts(
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            var accounts = await investmentsService.GetUserInvestmentAccountsAsync(userId);
            
            return Ok(accounts.Select(a => new InvestmentAccountDto
            {
                AccountId = a.AccountId,
                AccountName = a.AccountName,
                AccountType = a.AccountType.ToString(),
                CurrentBalance = a.CurrentBalance,
                PlaidAccountId = a.PlaidAccountId,
                ConnectionId = a.ConnectionId,
                LastSyncedAt = a.PlaidLastSyncedAt,
                SyncStatus = a.PlaidSyncStatus
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get investment accounts for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get investment accounts", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get holdings for an investment account
    /// </summary>
    [HttpGet("investments/accounts/{accountId}/holdings")]
    [ProducesResponseType(typeof(List<HoldingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<HoldingDto>>> GetAccountHoldings(
        int accountId,
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            var holdings = await investmentsService.GetAccountHoldingsAsync(accountId);
            
            return Ok(holdings.Select(h => new HoldingDto
            {
                HoldingId = h.HoldingId,
                Symbol = h.Symbol,
                Shares = h.Quantity,
                CostBasis = h.TotalCostBasis,
                CurrentPrice = h.CurrentPrice,
                MarketValue = h.CurrentValue,
                GainLoss = h.UnrealizedGainLoss,
                PlaidSecurityId = h.PlaidSecurityId,
                Cusip = h.Cusip,
                Isin = h.Isin,
                LastSyncedAt = h.PlaidLastSyncedAt
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get holdings for account {AccountId}", accountId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get holdings", Details = ex.Message });
        }
    }

    /// <summary>
    /// Sync investment transactions for a connection
    /// </summary>
    [HttpPost("investments/connections/{connectionId}/transactions/sync")]
    [ProducesResponseType(typeof(InvestmentTransactionsSyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvestmentTransactionsSyncResultDto>> SyncInvestmentTransactions(
        Guid connectionId,
        [FromQuery] int userId,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            _logger.LogInformation("Syncing investment transactions for connection {ConnectionId}, user {UserId}", 
                connectionId, userId);

            var result = await investmentsService.SyncInvestmentTransactionsAsync(connectionId, startDate, endDate);

            return Ok(new InvestmentTransactionsSyncResultDto
            {
                Success = result.Success,
                SyncedAt = result.SyncedAt,
                TransactionsCreated = result.TransactionsCreated,
                TransactionsUpdated = result.TransactionsUpdated,
                TransactionsTotal = result.TransactionsTotal,
                DurationMs = result.DurationMs,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync investment transactions for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to sync investment transactions", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get investment transactions for an account
    /// </summary>
    [HttpGet("investments/accounts/{accountId}/transactions")]
    [ProducesResponseType(typeof(List<InvestmentTransactionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<InvestmentTransactionDto>>> GetAccountInvestmentTransactions(
        int accountId,
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService,
        [FromQuery] int limit = 50)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            var transactions = await investmentsService.GetAccountInvestmentTransactionsAsync(accountId, limit);

            return Ok(transactions.Select(t => new InvestmentTransactionDto
            {
                TransactionId = t.TransactionId,
                AccountId = t.AccountId,
                TransactionType = t.TransactionType,
                Symbol = t.Symbol,
                Quantity = t.Quantity,
                Price = t.Price,
                Amount = t.Amount,
                Fee = t.Fee,
                TransactionDate = t.TransactionDate,
                Description = t.Description,
                PlaidInvestmentType = t.PlaidInvestmentType,
                PlaidInvestmentSubtype = t.PlaidInvestmentSubtype
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get investment transactions for account {AccountId}", accountId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get investment transactions", Details = ex.Message });
        }
    }

    /// <summary>
    /// Create a sandbox investment user with custom holdings (sandbox only)
    /// </summary>
    [HttpPost("investments/sandbox/seed")]
    [ProducesResponseType(typeof(SandboxSeedResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SandboxSeedResultDto>> CreateSandboxInvestmentUser(
        [FromBody] SandboxSeedRequest request,
        [FromQuery] int userId,
        [FromServices] IPlaidInvestmentsService investmentsService)
    {
        if (userId <= 0)
        {
            return BadRequest(new ErrorResponse { Error = "Valid user ID is required" });
        }

        try
        {
            _logger.LogInformation("Creating sandbox investment user for user {UserId}", userId);

            var config = new SandboxInvestmentConfig
            {
                AccountName = request.AccountName ?? "Test Investment Account",
                AccountSubtype = request.AccountSubtype ?? "brokerage",
                StartingBalance = request.StartingBalance ?? 100000m,
                Holdings = request.Holdings?.Select(h => new SandboxHoldingConfig
                {
                    SecurityId = h.SecurityId ?? Guid.NewGuid().ToString(),
                    TickerSymbol = h.TickerSymbol,
                    SecurityName = h.SecurityName,
                    SecurityType = h.SecurityType ?? "equity",
                    Quantity = h.Quantity,
                    CostBasis = h.CostBasis,
                    CurrentPrice = h.CurrentPrice,
                    Cusip = h.Cusip,
                    Isin = h.Isin
                }).ToList() ?? GetDefaultHoldings()
            };

            var result = await investmentsService.CreateSandboxInvestmentUserAsync(userId, config);

            return Ok(new SandboxSeedResultDto
            {
                Success = result.Success,
                ConnectionId = result.ConnectionId,
                ItemId = result.ItemId,
                AccountsCreated = result.AccountsCreated,
                HoldingsCreated = result.HoldingsCreated,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create sandbox investment user for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to create sandbox investment user", Details = ex.Message });
        }
    }

    private static List<SandboxHoldingConfig> GetDefaultHoldings()
    {
        return new List<SandboxHoldingConfig>
        {
            new()
            {
                SecurityId = "security_aapl",
                TickerSymbol = "AAPL",
                SecurityName = "Apple Inc.",
                SecurityType = "equity",
                Quantity = 50,
                CostBasis = 7500m,
                CurrentPrice = 175.50m
            },
            new()
            {
                SecurityId = "security_msft",
                TickerSymbol = "MSFT",
                SecurityName = "Microsoft Corporation",
                SecurityType = "equity",
                Quantity = 30,
                CostBasis = 9000m,
                CurrentPrice = 380.25m
            },
            new()
            {
                SecurityId = "security_vti",
                TickerSymbol = "VTI",
                SecurityName = "Vanguard Total Stock Market ETF",
                SecurityType = "etf",
                Quantity = 100,
                CostBasis = 22000m,
                CurrentPrice = 245.00m
            },
            new()
            {
                SecurityId = "security_bnd",
                TickerSymbol = "BND",
                SecurityName = "Vanguard Total Bond Market ETF",
                SecurityType = "etf",
                Quantity = 75,
                CostBasis = 5625m,
                CurrentPrice = 72.50m
            }
        };
    }

    #endregion

    #region Unified Connection Endpoints (Wave 12.5)

    /// <summary>
    /// Generate a unified Plaid Link token that can request multiple products.
    /// </summary>
    [HttpPost("unified/link-token")]
    [ProducesResponseType(typeof(LinkTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LinkTokenResponse>> CreateUnifiedLinkToken(
        [FromQuery] int userId,
        [FromBody] UnifiedLinkTokenRequest? request)
    {
        if (userId <= 0)
            return BadRequest("Valid user ID is required");

        try
        {
            var connectionService = HttpContext.RequestServices.GetRequiredService<IPlaidConnectionService>();
            var linkToken = await connectionService.CreateUnifiedLinkTokenAsync(userId, request?.Products);
            return Ok(new LinkTokenResponse { LinkToken = linkToken });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create unified link token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to create link token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exchange a Plaid public token for a unified connection spanning multiple products.
    /// </summary>
    [HttpPost("unified/exchange-token")]
    [ProducesResponseType(typeof(UnifiedConnectionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<UnifiedConnectionResultDto>> ExchangeUnifiedToken(
        [FromQuery] int userId,
        [FromBody] UnifiedExchangeTokenRequest request)
    {
        if (userId <= 0)
            return BadRequest("Valid user ID is required");

        if (string.IsNullOrEmpty(request.PublicToken))
            return BadRequest("Public token is required");

        try
        {
            var connectionService = HttpContext.RequestServices.GetRequiredService<IPlaidConnectionService>();
            var result = await connectionService.ExchangeUnifiedPublicTokenAsync(
                userId,
                request.PublicToken,
                request.InstitutionId,
                request.InstitutionName,
                request.Products);

            return Ok(new UnifiedConnectionResultDto
            {
                Success = result.Success,
                ConnectionId = result.ConnectionId,
                InstitutionName = result.InstitutionName,
                EnabledProducts = result.EnabledProducts,
                AccountsLinked = result.AccountsLinked,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to exchange unified token for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to exchange token", Details = ex.Message });
        }
    }

    /// <summary>
    /// Sync all products for a unified connection.
    /// </summary>
    [HttpPost("unified/connections/{connectionId}/sync")]
    [ProducesResponseType(typeof(UnifiedSyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<UnifiedSyncResultDto>> SyncUnifiedConnection([FromRoute] Guid connectionId)
    {
        try
        {
            var connectionService = HttpContext.RequestServices.GetRequiredService<IPlaidConnectionService>();
            var result = await connectionService.SyncUnifiedConnectionAsync(connectionId);

            return Ok(new UnifiedSyncResultDto
            {
                Success = result.Success,
                SyncedAt = result.SyncedAt,
                DurationMs = result.DurationMs,
                TransactionsSynced = result.TransactionsSynced,
                TransactionsCount = result.TransactionsCount,
                InvestmentsSynced = result.InvestmentsSynced,
                HoldingsCount = result.HoldingsCount,
                LiabilitiesSynced = result.LiabilitiesSynced,
                LiabilitiesCount = result.LiabilitiesCount,
                CreditCardTransactionsSynced = result.CreditCardTransactionsSynced,
                Errors = result.Errors
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync unified connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Sync failed", Details = ex.Message });
        }
    }

    /// <summary>
    /// Get all connections for a user with product availability info.
    /// </summary>
    [HttpGet("unified/connections")]
    [ProducesResponseType(typeof(List<ConnectionInfoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ConnectionInfoDto>>> GetUserConnections([FromQuery] int userId)
    {
        if (userId <= 0)
            return BadRequest("Valid user ID is required");

        try
        {
            var connectionService = HttpContext.RequestServices.GetRequiredService<IPlaidConnectionService>();
            var connections = await connectionService.GetUserConnectionsAsync(userId);

            return Ok(connections.Select(c => new ConnectionInfoDto
            {
                ConnectionId = c.ConnectionId,
                InstitutionId = c.InstitutionId,
                InstitutionName = c.InstitutionName,
                Source = c.Source.ToString(),
                Products = c.Products,
                IsUnified = c.IsUnified,
                Status = c.Status.ToString(),
                LastSyncedAt = c.LastSyncedAt,
                ConnectedAt = c.ConnectedAt
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get connections for user {UserId}", userId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to get connections", Details = ex.Message });
        }
    }

    /// <summary>
    /// Update products for an existing connection (e.g., add liabilities to a bank connection).
    /// </summary>
    [HttpPut("unified/connections/{connectionId}/products")]
    [ProducesResponseType(typeof(ConnectionInfoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ConnectionInfoDto>> UpdateConnectionProducts(
        [FromRoute] Guid connectionId,
        [FromBody] UpdateProductsRequest request)
    {
        if (request.Products == null || request.Products.Count == 0)
            return BadRequest("At least one product is required");

        try
        {
            var connectionService = HttpContext.RequestServices.GetRequiredService<IPlaidConnectionService>();
            var connection = await connectionService.UpdateConnectionProductsAsync(connectionId, request.Products);

            return Ok(new ConnectionInfoDto
            {
                ConnectionId = connection.ConnectionId,
                InstitutionId = connection.PlaidInstitutionId,
                InstitutionName = connection.PlaidInstitutionName,
                Source = connection.Source.ToString(),
                Products = request.Products,
                IsUnified = connection.IsUnified,
                Status = connection.Status.ToString(),
                LastSyncedAt = connection.LastSyncedAt,
                ConnectedAt = connection.ConnectedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update products for connection {ConnectionId}", connectionId);
            return StatusCode(500, new ErrorResponse { Error = "Failed to update products", Details = ex.Message });
        }
    }

    #endregion
}

// DTOs
public class LinkTokenResponse
{
    public string LinkToken { get; set; } = string.Empty;
}

public class ExchangeTokenRequest
{
    public string PublicToken { get; set; } = string.Empty;
    public string? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
}

public class ExchangeTokenResponse
{
    public ConnectionDto Connection { get; set; } = new();
    public List<AccountDto> Accounts { get; set; } = new();
}

public class ConnectionDto
{
    public Guid ConnectionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string? InstitutionId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime ConnectedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    /// <summary>
    /// Source type: "Plaid" for bank accounts, "PlaidInvestments" for brokerage/retirement
    /// </summary>
    public string Source { get; set; } = "Plaid";
}

public class AccountDto
{
    public Guid CashAccountId { get; set; }
    public int AccountId { get; set; }  // For investment accounts
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string? PlaidAccountId { get; set; }
    public string SyncStatus { get; set; } = string.Empty;
    public DateTime? LastSyncedAt { get; set; }
}

public class SyncResultDto
{
    public bool Success { get; set; }
    public int AccountsUpdated { get; set; }
    public string? ErrorMessage { get; set; }
}

public class SyncHistoryDto
{
    public Guid SyncHistoryId { get; set; }
    public DateTime SyncStartedAt { get; set; }
    public DateTime? SyncCompletedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public int AccountsUpdated { get; set; }
    public long? DurationMs { get; set; }
}

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public class TransactionSyncResultDto
{
    public bool Success { get; set; }
    public int TransactionsAdded { get; set; }
    public int TransactionsModified { get; set; }
    public int TransactionsRemoved { get; set; }
    public bool HasMore { get; set; }
    public string? ErrorMessage { get; set; }
}

public class TransactionDto
{
    public int TransactionId { get; set; }
    public Guid? CashAccountId { get; set; }
    public int? LiabilityAccountId { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? TransactionType { get; set; }
    public string? PlaidTransactionId { get; set; }
    public string? PlaidCategory { get; set; }
    public string? PlaidCategoryDetailed { get; set; }
    public string? PaymentChannel { get; set; }
    public string? MerchantLogoUrl { get; set; }
    public string? Source { get; set; }
}

#region Investment DTOs (Wave 12)

public class InvestmentsExchangeResponse
{
    public ConnectionDto Connection { get; set; } = new();
    public int AccountsCreated { get; set; }
}

public class InvestmentsSyncResultDto
{
    public bool Success { get; set; }
    public int AccountsUpdated { get; set; }
    public int HoldingsUpdated { get; set; }
    public int SecuritiesUpdated { get; set; }
    public int DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
}

public class InvestmentAccountDto
{
    public int AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string? PlaidAccountId { get; set; }
    public Guid? ConnectionId { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public int SyncStatus { get; set; }
}

public class HoldingDto
{
    public int HoldingId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public decimal Shares { get; set; }
    public decimal CostBasis { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal MarketValue { get; set; }
    public decimal GainLoss { get; set; }
    public string? PlaidSecurityId { get; set; }
    public string? Cusip { get; set; }
    public string? Isin { get; set; }
    public DateTime? LastSyncedAt { get; set; }
}

public class SandboxSeedRequest
{
    public string? AccountName { get; set; }
    public string? AccountSubtype { get; set; }
    public decimal? StartingBalance { get; set; }
    public List<SandboxHoldingRequest>? Holdings { get; set; }
}

public class SandboxHoldingRequest
{
    public string? SecurityId { get; set; }
    public string TickerSymbol { get; set; } = string.Empty;
    public string SecurityName { get; set; } = string.Empty;
    public string? SecurityType { get; set; }
    public decimal Quantity { get; set; }
    public decimal CostBasis { get; set; }
    public decimal CurrentPrice { get; set; }
    public string? Cusip { get; set; }
    public string? Isin { get; set; }
}

public class SandboxSeedResultDto
{
    public bool Success { get; set; }
    public Guid? ConnectionId { get; set; }
    public string? ItemId { get; set; }
    public int AccountsCreated { get; set; }
    public int HoldingsCreated { get; set; }
    public string? ErrorMessage { get; set; }
}

public class InvestmentTransactionsSyncResultDto
{
    public bool Success { get; set; }
    public DateTime SyncedAt { get; set; }
    public int TransactionsCreated { get; set; }
    public int TransactionsUpdated { get; set; }
    public int TransactionsTotal { get; set; }
    public int DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
}

public class InvestmentTransactionDto
{
    public int TransactionId { get; set; }
    public int AccountId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public string? Symbol { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
    public decimal Amount { get; set; }
    public decimal? Fee { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Description { get; set; }
    public string? PlaidInvestmentType { get; set; }
    public string? PlaidInvestmentSubtype { get; set; }
}

#endregion

#region Unified Connection DTOs (Wave 12.5)

public class UnifiedLinkTokenRequest
{
    public List<string>? Products { get; set; }
}

public class UnifiedExchangeTokenRequest
{
    public string PublicToken { get; set; } = string.Empty;
    public string? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public List<string>? Products { get; set; }
}

public class UnifiedConnectionResultDto
{
    public bool Success { get; set; }
    public Guid ConnectionId { get; set; }
    public string? InstitutionName { get; set; }
    public List<string> EnabledProducts { get; set; } = [];
    public int AccountsLinked { get; set; }
    public string? ErrorMessage { get; set; }
}

public class UnifiedSyncResultDto
{
    public bool Success { get; set; }
    public DateTime SyncedAt { get; set; }
    public int DurationMs { get; set; }
    public bool TransactionsSynced { get; set; }
    public int TransactionsCount { get; set; }
    public bool InvestmentsSynced { get; set; }
    public int HoldingsCount { get; set; }
    public bool LiabilitiesSynced { get; set; }
    public int LiabilitiesCount { get; set; }
    public int CreditCardTransactionsSynced { get; set; }
    public List<string> Errors { get; set; } = [];
}

public class ConnectionInfoDto
{
    public Guid ConnectionId { get; set; }
    public string? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public string Source { get; set; } = string.Empty;
    public List<string> Products { get; set; } = [];
    public bool IsUnified { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? LastSyncedAt { get; set; }
    public DateTime ConnectedAt { get; set; }
}

public class UpdateProductsRequest
{
    public List<string> Products { get; set; } = [];
}

#endregion
