using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Crypto
{
    /// <summary>
    /// Wave 13: Aggregated crypto holding for a single (connection, symbol, IsStaked) tuple.
    /// </summary>
    [Table("CryptoHoldings")]
    public class CryptoHolding
    {
        [Key]
        public int CryptoHoldingId { get; set; }

        [Required]
        public int ExchangeConnectionId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Symbol { get; set; } = string.Empty; // e.g. "BTC"

        [MaxLength(50)]
        public string? CoinGeckoId { get; set; } // e.g. "bitcoin"

        [Column(TypeName = "decimal(28,18)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? AvgCostBasisUsd { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal MarketValueUsd { get; set; }

        public DateTime LastPriceAt { get; set; } = DateTime.UtcNow;

        public bool IsStaked { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? StakingApyPercent { get; set; }

        public DateTime DateCreated { get; set; } = DateTime.UtcNow;
        public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

        [ForeignKey("ExchangeConnectionId")]
        public virtual ExchangeConnection ExchangeConnection { get; set; } = null!;
    }
}
