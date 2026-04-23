using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13: Pulls holdings + transactions from an adapter and reconciles them into PFMP storage.
    /// Idempotent: re-syncing the same window does not duplicate transactions.
    /// </summary>
    public interface ICryptoSyncService
    {
        Task<CryptoSyncResult> SyncConnectionAsync(ExchangeConnection connection, IExchangeAdapter adapter, CancellationToken cancellationToken = default);
    }

    public class CryptoSyncService : ICryptoSyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly IExchangeCredentialEncryptionService _encryption;
        private readonly ICoinGeckoPriceService _priceService;
        private readonly ILogger<CryptoSyncService> _logger;

        // Look-back window for the first sync of a connection if we have no prior history.
        private static readonly TimeSpan InitialSyncWindow = TimeSpan.FromDays(365);

        public CryptoSyncService(
            ApplicationDbContext context,
            IExchangeCredentialEncryptionService encryption,
            ICoinGeckoPriceService priceService,
            ILogger<CryptoSyncService> logger)
        {
            _context = context;
            _encryption = encryption;
            _priceService = priceService;
            _logger = logger;
        }

        public async Task<CryptoSyncResult> SyncConnectionAsync(ExchangeConnection connection, IExchangeAdapter adapter, CancellationToken cancellationToken = default)
        {
            string apiKey;
            string apiSecret;
            try
            {
                apiKey = _encryption.Decrypt(connection.EncryptedApiKey);
                apiSecret = _encryption.Decrypt(connection.EncryptedApiSecret);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decrypt credentials for connection {Id}", connection.ExchangeConnectionId);
                connection.Status = ExchangeConnectionStatus.Error;
                connection.LastSyncError = "Credential decryption failed";
                connection.DateUpdated = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                return new CryptoSyncResult { Error = connection.LastSyncError };
            }

            int holdingsUpserted = 0;
            int transactionsInserted = 0;
            int transactionsSkipped = 0;
            string? error = null;

            try
            {
                // 1. Holdings
                var snapshots = await adapter.GetHoldingsAsync(apiKey, apiSecret, cancellationToken);
                var existingHoldings = await _context.CryptoHoldings
                    .Where(h => h.ExchangeConnectionId == connection.ExchangeConnectionId)
                    .ToListAsync(cancellationToken);

                var symbols = snapshots.Select(s => s.Symbol).Distinct().ToList();
                var prices = symbols.Count == 0
                    ? new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
                    : (Dictionary<string, decimal>)await _priceService.GetSpotPricesUsdAsync(symbols, cancellationToken);

                var seen = new HashSet<(string Symbol, bool IsStaked)>();
                foreach (var snap in snapshots)
                {
                    seen.Add((snap.Symbol, snap.IsStaked));
                    var existing = existingHoldings
                        .FirstOrDefault(h => string.Equals(h.Symbol, snap.Symbol, StringComparison.OrdinalIgnoreCase) && h.IsStaked == snap.IsStaked);
                    var priceUsd = prices.TryGetValue(snap.Symbol, out var p) ? p : 0m;
                    var marketValue = priceUsd * snap.Quantity;
                    if (existing is null)
                    {
                        var coinGeckoId = await _priceService.ResolveCoinGeckoIdAsync(snap.Symbol, cancellationToken);
                        _context.CryptoHoldings.Add(new CryptoHolding
                        {
                            ExchangeConnectionId = connection.ExchangeConnectionId,
                            Symbol = snap.Symbol,
                            CoinGeckoId = coinGeckoId,
                            Quantity = snap.Quantity,
                            MarketValueUsd = marketValue,
                            LastPriceAt = DateTime.UtcNow,
                            IsStaked = snap.IsStaked,
                            StakingApyPercent = snap.StakingApyPercent,
                            DateCreated = DateTime.UtcNow,
                            DateUpdated = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        existing.Quantity = snap.Quantity;
                        existing.MarketValueUsd = marketValue;
                        existing.LastPriceAt = DateTime.UtcNow;
                        existing.StakingApyPercent = snap.StakingApyPercent;
                        existing.DateUpdated = DateTime.UtcNow;
                    }
                    holdingsUpserted++;
                }

                // Remove holdings that disappeared (e.g., asset fully sold).
                foreach (var stale in existingHoldings.Where(h => !seen.Contains((h.Symbol, h.IsStaked))))
                {
                    _context.CryptoHoldings.Remove(stale);
                }

                // 2. Transactions
                var since = connection.LastSyncAt ?? DateTime.UtcNow.Subtract(InitialSyncWindow);
                var records = await adapter.GetTransactionsAsync(apiKey, apiSecret, since, cancellationToken);
                if (records.Count > 0)
                {
                    var ids = records.Select(r => r.ExchangeTxId).ToList();
                    var existingIds = new HashSet<string>(await _context.CryptoTransactions
                        .Where(t => t.ExchangeConnectionId == connection.ExchangeConnectionId && ids.Contains(t.ExchangeTxId))
                        .Select(t => t.ExchangeTxId)
                        .ToListAsync(cancellationToken), StringComparer.OrdinalIgnoreCase);

                    foreach (var rec in records)
                    {
                        if (existingIds.Contains(rec.ExchangeTxId))
                        {
                            transactionsSkipped++;
                            continue;
                        }
                        var resolvedType = rec.TransactionType;
                        if (resolvedType == CryptoTransactionType.Buy && rec.Quantity < 0)
                        {
                            resolvedType = CryptoTransactionType.Sell;
                        }
                        _context.CryptoTransactions.Add(new CryptoTransaction
                        {
                            ExchangeConnectionId = connection.ExchangeConnectionId,
                            ExchangeTxId = rec.ExchangeTxId,
                            TransactionType = resolvedType,
                            Symbol = rec.Symbol,
                            Quantity = rec.Quantity,
                            PriceUsd = rec.PriceUsd,
                            FeeUsd = rec.FeeUsd,
                            ExecutedAt = rec.ExecutedAt,
                            RawJson = rec.RawJson,
                            DateCreated = DateTime.UtcNow
                        });
                        transactionsInserted++;
                    }
                }

                connection.Status = ExchangeConnectionStatus.Active;
                connection.LastSyncAt = DateTime.UtcNow;
                connection.LastSyncError = null;
                connection.DateUpdated = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Crypto sync failed for connection {Id}", connection.ExchangeConnectionId);
                connection.Status = ExchangeConnectionStatus.Error;
                connection.LastSyncError = Truncate(ex.Message, 1000);
                connection.DateUpdated = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                error = connection.LastSyncError;
            }

            return new CryptoSyncResult
            {
                HoldingsUpserted = holdingsUpserted,
                TransactionsInserted = transactionsInserted,
                TransactionsSkipped = transactionsSkipped,
                Error = error
            };
        }

        private static string Truncate(string value, int max) => value.Length <= max ? value : value.Substring(0, max);
    }
}
