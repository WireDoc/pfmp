using Microsoft.AspNetCore.Mvc;
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

    public PlaidController(IPlaidService plaidService, ILogger<PlaidController> logger)
    {
        _plaidService = plaidService;
        _logger = logger;
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
            if (!connections.Any(c => c.ConnectionId == connectionId))
            {
                return NotFound(new ErrorResponse { Error = "Connection not found" });
            }

            var accounts = await _plaidService.GetConnectionAccountsAsync(connectionId);
            return Ok(accounts.Select(a => new AccountDto
            {
                CashAccountId = a.CashAccountId,
                Name = a.Nickname,
                Balance = a.Balance,
                PlaidAccountId = a.PlaidAccountId,
                SyncStatus = a.SyncStatus.ToString(),
                LastSyncedAt = a.LastSyncedAt
            }).ToList());
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
            LastSyncedAt = connection.LastSyncedAt
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
}

public class AccountDto
{
    public Guid CashAccountId { get; set; }
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
    public Guid CashAccountId { get; set; }
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
