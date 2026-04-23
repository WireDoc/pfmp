using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Crypto
{
    /// <summary>
    /// Wave 13: Single crypto transaction sourced from an exchange.
    /// Idempotent on (ExchangeConnectionId, ExchangeTxId).
    /// </summary>
    [Table("CryptoTransactions")]
    public class CryptoTransaction
    {
        [Key]
        public int CryptoTransactionId { get; set; }

        [Required]
        public int ExchangeConnectionId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ExchangeTxId { get; set; } = string.Empty;

        public CryptoTransactionType TransactionType { get; set; }

        [Required]
        [MaxLength(20)]
        public string Symbol { get; set; } = string.Empty;

        /// <summary>
        /// Signed quantity. Positive for inflow (buy/deposit/reward); negative for outflow (sell/withdrawal/fee).
        /// </summary>
        [Column(TypeName = "decimal(28,18)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? PriceUsd { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? FeeUsd { get; set; }

        public DateTime ExecutedAt { get; set; }

        /// <summary>
        /// Original payload from the exchange for replay/debug. Stored as text (JSON) since not all providers are structurally consistent.
        /// </summary>
        public string? RawJson { get; set; }

        public DateTime DateCreated { get; set; } = DateTime.UtcNow;

        [ForeignKey("ExchangeConnectionId")]
        public virtual ExchangeConnection ExchangeConnection { get; set; } = null!;
    }

    public enum CryptoTransactionType
    {
        Buy = 0,
        Sell = 1,
        Deposit = 2,
        Withdrawal = 3,
        StakingReward = 4,
        EarnInterest = 5,
        Fee = 6,
        Transfer = 7,
        Other = 99
    }
}
