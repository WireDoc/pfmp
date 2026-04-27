using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Crypto
{
    /// <summary>
    /// Wave 13 Phase 3: A single open or closed acquisition lot for cost-basis tracking.
    /// Created when an inbound transaction (Buy/Deposit/StakingReward/EarnInterest) is processed and
    /// closed (fully or partially) by outbound transactions (Sell/Withdrawal) using FIFO when the
    /// exchange does not return its own lot detail.
    /// </summary>
    [Table("CryptoTaxLots")]
    public class CryptoTaxLot
    {
        [Key]
        public int CryptoTaxLotId { get; set; }

        [Required]
        public int ExchangeConnectionId { get; set; }

        /// <summary>
        /// Source transaction that opened this lot. Used to recompute lots idempotently.
        /// </summary>
        [Required]
        public int SourceTransactionId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Symbol { get; set; } = string.Empty;

        public DateTime AcquiredAt { get; set; }

        /// <summary>Original quantity acquired in this lot.</summary>
        [Column(TypeName = "decimal(28,18)")]
        public decimal OriginalQuantity { get; set; }

        /// <summary>Remaining (still open) quantity. 0 when lot is fully closed.</summary>
        [Column(TypeName = "decimal(28,18)")]
        public decimal RemainingQuantity { get; set; }

        /// <summary>Per-unit cost basis in USD. Zero for received-no-cost (rewards, transfers without basis info).</summary>
        [Column(TypeName = "decimal(18,8)")]
        public decimal CostBasisUsdPerUnit { get; set; }

        /// <summary>Total realized proceeds (USD) accumulated against this lot. Updated as outbound txns consume it.</summary>
        [Column(TypeName = "decimal(18,4)")]
        public decimal RealizedProceedsUsd { get; set; }

        /// <summary>Total realized cost basis (USD) consumed from this lot.</summary>
        [Column(TypeName = "decimal(18,4)")]
        public decimal RealizedCostBasisUsd { get; set; }

        /// <summary>Short-term realized gain (USD) — proceeds − basis on portions held ≤ 365 days.</summary>
        [Column(TypeName = "decimal(18,4)")]
        public decimal RealizedShortTermGainUsd { get; set; }

        /// <summary>Long-term realized gain (USD) — proceeds − basis on portions held > 365 days.</summary>
        [Column(TypeName = "decimal(18,4)")]
        public decimal RealizedLongTermGainUsd { get; set; }

        /// <summary>True when RemainingQuantity has been driven to zero.</summary>
        public bool IsClosed { get; set; }

        public DateTime? ClosedAt { get; set; }

        /// <summary>True if this lot was acquired via StakingReward / EarnInterest (zero-basis income).</summary>
        public bool IsRewardLot { get; set; }

        public DateTime DateCreated { get; set; } = DateTime.UtcNow;
        public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

        [ForeignKey("ExchangeConnectionId")]
        public virtual ExchangeConnection ExchangeConnection { get; set; } = null!;

        [ForeignKey("SourceTransactionId")]
        public virtual CryptoTransaction SourceTransaction { get; set; } = null!;
    }
}
