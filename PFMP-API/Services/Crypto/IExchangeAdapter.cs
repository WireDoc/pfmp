using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13: Adapter contract for a single crypto exchange.
    /// Each provider (Kraken, Binance.US, etc.) implements this against its own REST API.
    /// All implementations must be read-only — no order placement, no withdrawals.
    /// </summary>
    public interface IExchangeAdapter
    {
        /// <summary>Provider identifier matching <see cref="ExchangeConnection.Provider"/>.</summary>
        string Provider { get; }

        /// <summary>
        /// Validate the supplied API key + secret against the exchange.
        /// Implementations MUST verify the key has only read scopes; return false if trading or withdrawal scopes are detected.
        /// </summary>
        Task<ExchangeKeyValidationResult> ValidateKeysAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fetch current balances. Returns one entry per asset, with IsStaked discriminating liquid vs locked balances.
        /// </summary>
        Task<IReadOnlyList<ExchangeHoldingSnapshot>> GetHoldingsAsync(string apiKey, string apiSecret, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fetch transaction history since the supplied timestamp (UTC). Implementations should page internally.
        /// </summary>
        Task<IReadOnlyList<ExchangeTransactionRecord>> GetTransactionsAsync(string apiKey, string apiSecret, DateTime sinceUtc, CancellationToken cancellationToken = default);
    }

    public class ExchangeKeyValidationResult
    {
        public bool IsValid { get; init; }
        public bool IsReadOnly { get; init; }
        public IReadOnlyList<string> Scopes { get; init; } = Array.Empty<string>();
        public string? ErrorMessage { get; init; }
    }

    public class ExchangeHoldingSnapshot
    {
        public string Symbol { get; init; } = string.Empty;
        public decimal Quantity { get; init; }
        public bool IsStaked { get; init; }
        public decimal? StakingApyPercent { get; init; }
    }

    public class ExchangeTransactionRecord
    {
        public string ExchangeTxId { get; init; } = string.Empty;
        public CryptoTransactionType TransactionType { get; init; }
        public string Symbol { get; init; } = string.Empty;
        public decimal Quantity { get; init; }
        public decimal? PriceUsd { get; init; }
        public decimal? FeeUsd { get; init; }
        public DateTime ExecutedAt { get; init; }
        public string? RawJson { get; init; }
    }
}
