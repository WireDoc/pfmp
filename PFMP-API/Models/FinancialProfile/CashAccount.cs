using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("CashAccounts")]
    public class CashAccount
    {
        [Key]
        public Guid CashAccountId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Nickname { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Institution { get; set; }

        [MaxLength(50)]
        public string? AccountNumber { get; set; } // Last 4 digits or full account number (encrypted recommended)

        [MaxLength(20)]
        public string? RoutingNumber { get; set; } // 9-digit bank routing number

        [MaxLength(40)]
        public string AccountType { get; set; } = "checking";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? InterestRateApr { get; set; }

        public bool IsEmergencyFund { get; set; }

        [MaxLength(500)]
        public string? Purpose { get; set; } // e.g., "Transactional Account", "Emergency Fund", "Home Improvement Savings"

        public DateTime? RateLastChecked { get; set; }

        // ===== Plaid Integration Fields (Wave 11) =====
        
        /// <summary>
        /// Source of account data - manual entry, CSV import, or Plaid linked.
        /// </summary>
        public AccountSource Source { get; set; } = AccountSource.Manual;

        /// <summary>
        /// Plaid Item ID that this account belongs to. References AccountConnection.
        /// </summary>
        [MaxLength(100)]
        public string? PlaidItemId { get; set; }

        /// <summary>
        /// Plaid's unique identifier for this specific account.
        /// </summary>
        [MaxLength(100)]
        public string? PlaidAccountId { get; set; }

        /// <summary>
        /// When this account was last synced with Plaid.
        /// </summary>
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>
        /// Current sync status for this account.
        /// </summary>
        public SyncStatus SyncStatus { get; set; } = SyncStatus.NotConnected;

        /// <summary>
        /// Error message from last sync attempt, if any.
        /// </summary>
        [MaxLength(500)]
        public string? SyncErrorMessage { get; set; }

        /// <summary>
        /// When true, user can override the synced balance with a manual value.
        /// </summary>
        public bool AllowManualOverride { get; set; } = true;

        /// <summary>
        /// User's manual balance override. When set, this takes precedence over synced balance.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? ManualBalanceOverride { get; set; }

        // ===== End Plaid Fields =====

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ===== Helper Methods =====

        /// <summary>
        /// Gets the display balance, considering manual overrides.
        /// </summary>
        public decimal GetDisplayBalance()
        {
            if (AllowManualOverride && ManualBalanceOverride.HasValue)
            {
                return ManualBalanceOverride.Value;
            }
            return Balance;
        }

        /// <summary>
        /// Returns true if this account is linked via Plaid.
        /// </summary>
        public bool IsLinked => Source == AccountSource.Plaid && !string.IsNullOrEmpty(PlaidAccountId);
    }
}
