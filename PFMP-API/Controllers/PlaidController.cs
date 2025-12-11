using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFMP_API.Models.Plaid;
using PFMP_API.Services.Plaid;
using System.Security.Claims;

namespace PFMP_API.Controllers;

/// <summary>
/// Controller for Plaid integration - bank account linking and balance sync
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LinkTokenResponse>> CreateLinkToken()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            _logger.LogInformation("Creating Plaid Link token for user {UserId}", userId);
            var linkToken = await _plaidService.CreateLinkTokenAsync(userId.Value);
            
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
    /// <returns>The created account connection with linked accounts</returns>
    [HttpPost("exchange-token")]
    [ProducesResponseType(typeof(ExchangeTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ExchangeTokenResponse>> ExchangePublicToken([FromBody] ExchangeTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PublicToken))
        {
            return BadRequest(new ErrorResponse { Error = "Public token is required" });
        }

        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            _logger.LogInformation("Exchanging Plaid public token for user {UserId}", userId);
            var connection = await _plaidService.ExchangePublicTokenAsync(userId.Value, request.PublicToken);
            
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
    /// Get all Plaid connections for the authenticated user
    /// </summary>
    /// <returns>List of account connections</returns>
    [HttpGet("connections")]
    [ProducesResponseType(typeof(List<ConnectionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<ConnectionDto>>> GetConnections()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            var connections = await _plaidService.GetUserConnectionsAsync(userId.Value);
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
    /// <returns>List of accounts linked to this connection</returns>
    [HttpGet("connections/{connectionId}/accounts")]
    [ProducesResponseType(typeof(List<AccountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<AccountDto>>> GetConnectionAccounts(Guid connectionId)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId.Value);
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
    /// <returns>Sync result with updated accounts</returns>
    [HttpPost("connections/{connectionId}/sync")]
    [ProducesResponseType(typeof(SyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SyncResultDto>> SyncConnection(Guid connectionId)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId.Value);
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
    /// Sync all connections for the authenticated user
    /// </summary>
    /// <returns>Aggregate sync result</returns>
    [HttpPost("sync-all")]
    [ProducesResponseType(typeof(SyncResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SyncResultDto>> SyncAllConnections()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            _logger.LogInformation("Manual sync-all triggered for user {UserId}", userId);
            var result = await _plaidService.SyncAllUserConnectionsAsync(userId.Value);
            
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
    /// <returns>No content on success</returns>
    [HttpDelete("connections/{connectionId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DisconnectConnection(Guid connectionId)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId.Value);
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
    /// Get sync history for a specific connection
    /// </summary>
    /// <param name="connectionId">The connection ID</param>
    /// <param name="limit">Maximum number of history entries to return (default 10)</param>
    /// <returns>List of sync history entries</returns>
    [HttpGet("connections/{connectionId}/history")]
    [ProducesResponseType(typeof(List<SyncHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<SyncHistoryDto>>> GetSyncHistory(Guid connectionId, [FromQuery] int limit = 10)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized("User ID not found in claims");
        }

        try
        {
            // Verify connection belongs to user
            var connections = await _plaidService.GetUserConnectionsAsync(userId.Value);
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

    private int? GetUserIdFromClaims()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("UserId")?.Value;
            
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
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
}

// DTOs
public class LinkTokenResponse
{
    public string LinkToken { get; set; } = string.Empty;
}

public class ExchangeTokenRequest
{
    public string PublicToken { get; set; } = string.Empty;
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
