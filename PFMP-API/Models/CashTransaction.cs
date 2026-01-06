using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Models;

/// <summary>
/// Represents a transaction for a cash account or credit card.
/// Supports both CashAccounts (checking, savings) and LiabilityAccounts (credit cards).
/// One of CashAccountId or LiabilityAccountId must be set.
/// </summary>
public class CashTransaction
{
    [Key]
    public int CashTransactionId { get; set; }

    /// <summary>
    /// Links to the CashAccounts table (UUID-based).
    /// Nullable for credit card transactions.
    /// </summary>
    public Guid? CashAccountId { get; set; }

    /// <summary>
    /// Links to the LiabilityAccounts table (int-based).
    /// Used for credit card transactions.
    /// </summary>
    public int? LiabilityAccountId { get; set; }

    /// <summary>
    /// Type of transaction: Deposit, Withdrawal, Transfer, Fee, Interest, Refund, Purchase, Payment
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string TransactionType { get; set; } = string.Empty;

    /// <summary>
    /// Transaction amount (positive for deposits, negative for withdrawals)
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Date the transaction occurred
    /// </summary>
    [Required]
    public DateTime TransactionDate { get; set; }

    /// <summary>
    /// Transaction description/memo
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Category for budgeting: Groceries, Rent, Utilities, Dining, Transportation, etc.
    /// </summary>
    [MaxLength(100)]
    public string? Category { get; set; }

    /// <summary>
    /// Merchant or payee name
    /// </summary>
    [MaxLength(200)]
    public string? Merchant { get; set; }

    /// <summary>
    /// Check number if applicable
    /// </summary>
    [MaxLength(20)]
    public string? CheckNumber { get; set; }

    /// <summary>
    /// Transaction fee (ATM fees, wire transfer fees, etc.)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Fee { get; set; }

    /// <summary>
    /// Optional tags for categorization (comma-separated or JSON)
    /// </summary>
    [MaxLength(500)]
    public string? Tags { get; set; }

    /// <summary>
    /// Whether this transaction is pending (not yet cleared)
    /// </summary>
    public bool IsPending { get; set; } = false;

    /// <summary>
    /// Whether this transaction is recurring (auto-pay, subscription, etc.)
    /// </summary>
    public bool IsRecurring { get; set; } = false;

    /// <summary>
    /// External transaction ID from bank API or import
    /// </summary>
    [MaxLength(100)]
    public string? ExternalTransactionId { get; set; }

    /// <summary>
    /// Plaid transaction ID (unique across all Plaid transactions)
    /// </summary>
    [MaxLength(100)]
    public string? PlaidTransactionId { get; set; }

    /// <summary>
    /// Source of this transaction: Manual, CSV, Plaid
    /// </summary>
    [MaxLength(20)]
    public string? Source { get; set; }

    /// <summary>
    /// Plaid personal finance category (primary), e.g., "FOOD_AND_DRINK", "TRANSPORTATION"
    /// </summary>
    [MaxLength(100)]
    public string? PlaidCategory { get; set; }

    /// <summary>
    /// Plaid personal finance category (detailed), e.g., "FOOD_AND_DRINK_RESTAURANTS"
    /// </summary>
    [MaxLength(150)]
    public string? PlaidCategoryDetailed { get; set; }

    /// <summary>
    /// Payment channel: online, in store, other
    /// </summary>
    [MaxLength(20)]
    public string? PaymentChannel { get; set; }

    /// <summary>
    /// Merchant logo URL from Plaid
    /// </summary>
    [MaxLength(500)]
    public string? MerchantLogoUrl { get; set; }

    /// <summary>
    /// Additional notes
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// When this transaction was created in our system
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this transaction was last updated
    /// </summary>
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(CashAccountId))]
    public CashAccount? CashAccount { get; set; }

    [ForeignKey(nameof(LiabilityAccountId))]
    public LiabilityAccount? LiabilityAccount { get; set; }
}
