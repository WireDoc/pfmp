using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Crypto
{
    /// <summary>
    /// Wave 13: Crypto exchange connection (read-only API key + secret).
    /// One per (UserId, Provider, Nickname).
    /// </summary>
    [Table("ExchangeConnections")]
    public class ExchangeConnection
    {
        [Key]
        public int ExchangeConnectionId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = string.Empty; // "Kraken", "BinanceUs"

        [MaxLength(100)]
        public string? Nickname { get; set; }

        /// <summary>
        /// Data Protection API encrypted API key. Never expose plaintext.
        /// </summary>
        [Required]
        [MaxLength(2000)]
        public string EncryptedApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Data Protection API encrypted API secret. Never expose plaintext.
        /// </summary>
        [Required]
        [MaxLength(4000)]
        public string EncryptedApiSecret { get; set; } = string.Empty;

        /// <summary>
        /// JSON list of scopes returned by the exchange capability check, e.g. ["query_funds","query_ledger"].
        /// </summary>
        [MaxLength(1000)]
        public string? Scopes { get; set; }

        public ExchangeConnectionStatus Status { get; set; } = ExchangeConnectionStatus.Active;

        public DateTime? LastSyncAt { get; set; }

        [MaxLength(1000)]
        public string? LastSyncError { get; set; }

        public DateTime DateCreated { get; set; } = DateTime.UtcNow;
        public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        public virtual ICollection<CryptoHolding> Holdings { get; set; } = new List<CryptoHolding>();
        public virtual ICollection<CryptoTransaction> Transactions { get; set; } = new List<CryptoTransaction>();
    }

    public enum ExchangeConnectionStatus
    {
        Active = 0,
        Expired = 1,
        RevokedByUser = 2,
        Error = 3
    }
}
