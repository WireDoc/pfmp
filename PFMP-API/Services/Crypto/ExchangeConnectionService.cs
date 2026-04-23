using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13: CRUD + sync orchestration for crypto exchange connections.
    /// </summary>
    public interface IExchangeConnectionService
    {
        Task<IReadOnlyList<ExchangeConnection>> GetConnectionsAsync(int userId, CancellationToken cancellationToken = default);
        Task<ExchangeConnection?> GetConnectionAsync(int userId, int exchangeConnectionId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Validate the supplied API key/secret with the provider, persist an encrypted connection,
        /// and immediately run an initial sync. Throws on validation failure or trading-scope keys.
        /// </summary>
        Task<ExchangeConnection> CreateConnectionAsync(int userId, string provider, string? nickname, string apiKey, string apiSecret, CancellationToken cancellationToken = default);

        Task DeleteConnectionAsync(int userId, int exchangeConnectionId, CancellationToken cancellationToken = default);

        /// <summary>Run a sync for one connection. Updates LastSyncAt + status.</summary>
        Task<CryptoSyncResult> SyncConnectionAsync(int exchangeConnectionId, CancellationToken cancellationToken = default);
    }

    public class CryptoSyncResult
    {
        public int HoldingsUpserted { get; init; }
        public int TransactionsInserted { get; init; }
        public int TransactionsSkipped { get; init; }
        public string? Error { get; init; }
    }

    public class ExchangeConnectionService : IExchangeConnectionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IExchangeCredentialEncryptionService _encryption;
        private readonly ICryptoSyncService _syncService;
        private readonly IEnumerable<IExchangeAdapter> _adapters;
        private readonly ILogger<ExchangeConnectionService> _logger;

        public ExchangeConnectionService(
            ApplicationDbContext context,
            IExchangeCredentialEncryptionService encryption,
            ICryptoSyncService syncService,
            IEnumerable<IExchangeAdapter> adapters,
            ILogger<ExchangeConnectionService> logger)
        {
            _context = context;
            _encryption = encryption;
            _syncService = syncService;
            _adapters = adapters;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ExchangeConnection>> GetConnectionsAsync(int userId, CancellationToken cancellationToken = default)
        {
            return await _context.ExchangeConnections
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.Provider).ThenBy(c => c.Nickname)
                .ToListAsync(cancellationToken);
        }

        public async Task<ExchangeConnection?> GetConnectionAsync(int userId, int exchangeConnectionId, CancellationToken cancellationToken = default)
        {
            return await _context.ExchangeConnections
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeConnectionId == exchangeConnectionId, cancellationToken);
        }

        public async Task<ExchangeConnection> CreateConnectionAsync(int userId, string provider, string? nickname, string apiKey, string apiSecret, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(provider)) throw new ArgumentException("Provider is required", nameof(provider));
            if (string.IsNullOrWhiteSpace(apiKey)) throw new ArgumentException("API key is required", nameof(apiKey));
            if (string.IsNullOrWhiteSpace(apiSecret)) throw new ArgumentException("API secret is required", nameof(apiSecret));

            var adapter = _adapters.FirstOrDefault(a => string.Equals(a.Provider, provider, StringComparison.OrdinalIgnoreCase))
                ?? throw new InvalidOperationException($"No adapter registered for provider '{provider}'");

            var validation = await adapter.ValidateKeysAsync(apiKey, apiSecret, cancellationToken);
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(validation.ErrorMessage ?? "API key validation failed.");
            }
            if (!validation.IsReadOnly)
            {
                throw new InvalidOperationException("API key has trading or withdrawal scopes; PFMP requires a read-only key.");
            }

            var connection = new ExchangeConnection
            {
                UserId = userId,
                Provider = adapter.Provider,
                Nickname = string.IsNullOrWhiteSpace(nickname) ? null : nickname.Trim(),
                EncryptedApiKey = _encryption.Encrypt(apiKey),
                EncryptedApiSecret = _encryption.Encrypt(apiSecret),
                Scopes = validation.Scopes.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(validation.Scopes),
                Status = ExchangeConnectionStatus.Active,
                DateCreated = DateTime.UtcNow,
                DateUpdated = DateTime.UtcNow
            };
            _context.ExchangeConnections.Add(connection);
            await _context.SaveChangesAsync(cancellationToken);

            // Initial sync (best-effort; errors update the connection but do not throw).
            var result = await _syncService.SyncConnectionAsync(connection, adapter, cancellationToken);
            if (result.Error is not null)
            {
                _logger.LogWarning("Initial sync for connection {Id} returned error: {Error}", connection.ExchangeConnectionId, result.Error);
            }
            return connection;
        }

        public async Task DeleteConnectionAsync(int userId, int exchangeConnectionId, CancellationToken cancellationToken = default)
        {
            var connection = await _context.ExchangeConnections
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeConnectionId == exchangeConnectionId, cancellationToken);
            if (connection is null) return;
            _context.ExchangeConnections.Remove(connection);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<CryptoSyncResult> SyncConnectionAsync(int exchangeConnectionId, CancellationToken cancellationToken = default)
        {
            var connection = await _context.ExchangeConnections
                .FirstOrDefaultAsync(c => c.ExchangeConnectionId == exchangeConnectionId, cancellationToken)
                ?? throw new InvalidOperationException($"Connection {exchangeConnectionId} not found");
            var adapter = _adapters.FirstOrDefault(a => string.Equals(a.Provider, connection.Provider, StringComparison.OrdinalIgnoreCase))
                ?? throw new InvalidOperationException($"No adapter registered for provider '{connection.Provider}'");
            return await _syncService.SyncConnectionAsync(connection, adapter, cancellationToken);
        }
    }
}
