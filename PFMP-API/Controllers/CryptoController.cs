using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.DTOs.Crypto;
using PFMP_API.Models.Crypto;
using PFMP_API.Services.Crypto;
using System.Text.Json;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Wave 13 / Phase 1: Crypto exchange connections + holdings + transactions.
    /// Auth: PFMP currently uses dev-bypass; user id is supplied via query parameter to mirror existing controllers.
    /// </summary>
    [ApiController]
    [Route("api/crypto")]
    public class CryptoController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExchangeConnectionService _connectionService;
        private readonly ILogger<CryptoController> _logger;

        // Per-connection on-demand sync rate limit (1 per hour) tracked in-memory.
        // Hangfire still runs the daily batch regardless.
        private static readonly Dictionary<int, DateTime> LastManualSync = new();
        private static readonly object SyncLock = new();
        private static readonly TimeSpan ManualSyncCooldown = TimeSpan.FromHours(1);

        public CryptoController(
            ApplicationDbContext context,
            IExchangeConnectionService connectionService,
            ILogger<CryptoController> logger)
        {
            _context = context;
            _connectionService = connectionService;
            _logger = logger;
        }

        // GET: /api/crypto/connections?userId=1
        [HttpGet("connections")]
        public async Task<ActionResult<IEnumerable<ExchangeConnectionResponse>>> GetConnections([FromQuery] int userId, CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            var connections = await _connectionService.GetConnectionsAsync(userId, cancellationToken);
            return Ok(connections.Select(MapConnection));
        }

        // POST: /api/crypto/connections?userId=1
        [HttpPost("connections")]
        public async Task<ActionResult<ExchangeConnectionResponse>> CreateConnection([FromQuery] int userId, [FromBody] CreateExchangeConnectionRequest request, CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            if (request is null) return BadRequest("request body is required");

            try
            {
                var created = await _connectionService.CreateConnectionAsync(
                    userId,
                    request.Provider,
                    request.Nickname,
                    request.ApiKey,
                    request.ApiSecret,
                    cancellationToken);
                return CreatedAtAction(nameof(GetConnections), new { userId }, MapConnection(created));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Crypto connection rejected for user {UserId}: {Message}", userId, ex.Message);
                return BadRequest(ex.Message);
            }
        }

        // DELETE: /api/crypto/connections/{id}?userId=1
        [HttpDelete("connections/{id}")]
        public async Task<IActionResult> DeleteConnection(int id, [FromQuery] int userId, CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            var existing = await _connectionService.GetConnectionAsync(userId, id, cancellationToken);
            if (existing is null) return NotFound();
            await _connectionService.DeleteConnectionAsync(userId, id, cancellationToken);
            return NoContent();
        }

        // POST: /api/crypto/connections/{id}/sync?userId=1
        [HttpPost("connections/{id}/sync")]
        public async Task<ActionResult<CryptoSyncResponse>> SyncConnection(int id, [FromQuery] int userId, CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            var existing = await _connectionService.GetConnectionAsync(userId, id, cancellationToken);
            if (existing is null) return NotFound();

            lock (SyncLock)
            {
                if (LastManualSync.TryGetValue(id, out var last) && DateTime.UtcNow - last < ManualSyncCooldown)
                {
                    var retryAfter = ManualSyncCooldown - (DateTime.UtcNow - last);
                    Response.Headers["Retry-After"] = ((int)retryAfter.TotalSeconds).ToString();
                    return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Sync rate-limited to once per hour", retryAfterSeconds = (int)retryAfter.TotalSeconds });
                }
                LastManualSync[id] = DateTime.UtcNow;
            }

            var result = await _connectionService.SyncConnectionAsync(id, cancellationToken);
            // Re-fetch to pick up updated LastSyncAt.
            var refreshed = await _connectionService.GetConnectionAsync(userId, id, cancellationToken);
            return Ok(new CryptoSyncResponse
            {
                HoldingsUpserted = result.HoldingsUpserted,
                TransactionsInserted = result.TransactionsInserted,
                TransactionsSkipped = result.TransactionsSkipped,
                Error = result.Error,
                LastSyncAt = refreshed?.LastSyncAt
            });
        }

        // GET: /api/crypto/holdings?userId=1
        [HttpGet("holdings")]
        public async Task<ActionResult<IEnumerable<CryptoHoldingResponse>>> GetHoldings([FromQuery] int userId, CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            var holdings = await _context.CryptoHoldings
                .Include(h => h.ExchangeConnection)
                .Where(h => h.ExchangeConnection.UserId == userId)
                .OrderByDescending(h => h.MarketValueUsd)
                .ToListAsync(cancellationToken);
            return Ok(holdings.Select(MapHolding));
        }

        // GET: /api/crypto/transactions?userId=1&connectionId=&since=
        [HttpGet("transactions")]
        public async Task<ActionResult<IEnumerable<CryptoTransactionResponse>>> GetTransactions(
            [FromQuery] int userId,
            [FromQuery] int? connectionId,
            [FromQuery] DateTime? since,
            CancellationToken cancellationToken)
        {
            if (userId <= 0) return BadRequest("userId is required");
            var query = _context.CryptoTransactions
                .Include(t => t.ExchangeConnection)
                .Where(t => t.ExchangeConnection.UserId == userId);
            if (connectionId.HasValue) query = query.Where(t => t.ExchangeConnectionId == connectionId.Value);
            if (since.HasValue) query = query.Where(t => t.ExecutedAt >= since.Value);
            var rows = await query
                .OrderByDescending(t => t.ExecutedAt)
                .Take(500)
                .ToListAsync(cancellationToken);
            return Ok(rows.Select(MapTransaction));
        }

        // ---- Mapping ----

        private static ExchangeConnectionResponse MapConnection(ExchangeConnection c)
        {
            IReadOnlyList<string> scopes = Array.Empty<string>();
            if (!string.IsNullOrWhiteSpace(c.Scopes))
            {
                try
                {
                    scopes = JsonSerializer.Deserialize<List<string>>(c.Scopes) ?? new List<string>();
                }
                catch
                {
                    // ignore malformed scope payload
                }
            }
            return new ExchangeConnectionResponse
            {
                ExchangeConnectionId = c.ExchangeConnectionId,
                Provider = c.Provider,
                Nickname = c.Nickname,
                Status = c.Status,
                LastSyncAt = c.LastSyncAt,
                LastSyncError = c.LastSyncError,
                Scopes = scopes,
                DateCreated = c.DateCreated
            };
        }

        private static CryptoHoldingResponse MapHolding(CryptoHolding h) => new()
        {
            CryptoHoldingId = h.CryptoHoldingId,
            ExchangeConnectionId = h.ExchangeConnectionId,
            Provider = h.ExchangeConnection?.Provider ?? string.Empty,
            Symbol = h.Symbol,
            CoinGeckoId = h.CoinGeckoId,
            Quantity = h.Quantity,
            AvgCostBasisUsd = h.AvgCostBasisUsd,
            MarketValueUsd = h.MarketValueUsd,
            IsStaked = h.IsStaked,
            StakingApyPercent = h.StakingApyPercent,
            LastPriceAt = h.LastPriceAt
        };

        private static CryptoTransactionResponse MapTransaction(CryptoTransaction t) => new()
        {
            CryptoTransactionId = t.CryptoTransactionId,
            ExchangeConnectionId = t.ExchangeConnectionId,
            Provider = t.ExchangeConnection?.Provider ?? string.Empty,
            ExchangeTxId = t.ExchangeTxId,
            TransactionType = t.TransactionType,
            Symbol = t.Symbol,
            Quantity = t.Quantity,
            PriceUsd = t.PriceUsd,
            FeeUsd = t.FeeUsd,
            ExecutedAt = t.ExecutedAt
        };
    }
}
