using System.ComponentModel.DataAnnotations;
using PFMP_API.Models.Crypto;

namespace PFMP_API.DTOs.Crypto
{
    public class ExchangeConnectionResponse
    {
        public int ExchangeConnectionId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string? Nickname { get; set; }
        public ExchangeConnectionStatus Status { get; set; }
        public DateTime? LastSyncAt { get; set; }
        public string? LastSyncError { get; set; }
        public IReadOnlyList<string> Scopes { get; set; } = Array.Empty<string>();
        public DateTime DateCreated { get; set; }
    }

    public class CreateExchangeConnectionRequest
    {
        [Required, StringLength(50)]
        public string Provider { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Nickname { get; set; }

        [Required, StringLength(500, MinimumLength = 5)]
        public string ApiKey { get; set; } = string.Empty;

        [Required, StringLength(500, MinimumLength = 5)]
        public string ApiSecret { get; set; } = string.Empty;
    }

    public class CryptoHoldingResponse
    {
        public int CryptoHoldingId { get; set; }
        public int ExchangeConnectionId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public string? CoinGeckoId { get; set; }
        public decimal Quantity { get; set; }
        public decimal? AvgCostBasisUsd { get; set; }
        public decimal MarketValueUsd { get; set; }
        public bool IsStaked { get; set; }
        public decimal? StakingApyPercent { get; set; }
        public DateTime LastPriceAt { get; set; }
    }

    public class CryptoTransactionResponse
    {
        public int CryptoTransactionId { get; set; }
        public int ExchangeConnectionId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string ExchangeTxId { get; set; } = string.Empty;
        public CryptoTransactionType TransactionType { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal? PriceUsd { get; set; }
        public decimal? FeeUsd { get; set; }
        public DateTime ExecutedAt { get; set; }
    }

    public class CryptoSyncResponse
    {
        public int HoldingsUpserted { get; set; }
        public int TransactionsInserted { get; set; }
        public int TransactionsSkipped { get; set; }
        public string? Error { get; set; }
        public DateTime? LastSyncAt { get; set; }
    }

    public class CryptoTaxLotResponse
    {
        public int CryptoTaxLotId { get; set; }
        public int ExchangeConnectionId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public DateTime AcquiredAt { get; set; }
        public decimal OriginalQuantity { get; set; }
        public decimal RemainingQuantity { get; set; }
        public decimal CostBasisUsdPerUnit { get; set; }
        public decimal RealizedProceedsUsd { get; set; }
        public decimal RealizedCostBasisUsd { get; set; }
        public decimal RealizedShortTermGainUsd { get; set; }
        public decimal RealizedLongTermGainUsd { get; set; }
        public bool IsClosed { get; set; }
        public DateTime? ClosedAt { get; set; }
        public bool IsRewardLot { get; set; }
    }
}
