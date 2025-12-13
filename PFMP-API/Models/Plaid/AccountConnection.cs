using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Plaid
{
    /// <summary>
    /// Represents a connection to an external financial institution via Plaid.
    /// One connection (Plaid "Item") can yield multiple accounts.
    /// </summary>
    [Table("AccountConnections")]
    public class AccountConnection
    {
        [Key]
        public Guid ConnectionId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        public AccountSource Source { get; set; }

        // Plaid-specific fields
        [MaxLength(100)]
        public string? PlaidItemId { get; set; }

        /// <summary>
        /// Encrypted Plaid access token. Never expose in API responses.
        /// </summary>
        [MaxLength(1000)]
        public string? PlaidAccessToken { get; set; }

        [MaxLength(50)]
        public string? PlaidInstitutionId { get; set; }

        [MaxLength(200)]
        public string? PlaidInstitutionName { get; set; }

        // Connection state
        public SyncStatus Status { get; set; } = SyncStatus.Connected;

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        public int SyncFailureCount { get; set; } = 0;

        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>
        /// Cursor for incremental transaction sync (from /transactions/sync).
        /// Null means initial sync required.
        /// </summary>
        [MaxLength(500)]
        public string? TransactionsCursor { get; set; }

        /// <summary>
        /// When transactions were last synced for this connection.
        /// </summary>
        public DateTime? TransactionsLastSyncedAt { get; set; }

        // Navigation
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }

    /// <summary>
    /// Source of account data - manual entry, CSV import, or linked via API.
    /// </summary>
    public enum AccountSource
    {
        Manual = 0,
        CSV = 1,
        Plaid = 2,
        // Future: PlaidInvestments, TDAmeritrade, Coinbase, etc.
        PlaidInvestments = 3,
        TDAmeritrade = 4,
        Schwab = 5,
        ETrade = 6,
        Coinbase = 7,
        Binance = 8
    }

    /// <summary>
    /// Status of a connection or account sync.
    /// </summary>
    public enum SyncStatus
    {
        NotConnected = 0,
        Connected = 1,
        Syncing = 2,
        SyncFailed = 3,
        Expired = 4,      // Token expired, re-auth needed
        Disconnected = 5  // User disconnected intentionally
    }
}
