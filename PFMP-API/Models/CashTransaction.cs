using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Models;

/// <summary>
/// Represents a transaction for a cash account (checking, savings, money market).
/// Separate from investment Transactions table to keep concerns separated.
/// </summary>
public class CashTransaction
{
    [Key]
    public int CashTransactionId { get; set; }

    /// <summary>
    /// Links to the CashAccounts table (UUID-based)
    /// </summary>
    [Required]
    public Guid CashAccountId { get; set; }

    /// <summary>
    /// Type of transaction: Deposit, Withdrawal, Transfer, Fee, Interest, Refund
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

    // Navigation property
    [ForeignKey(nameof(CashAccountId))]
    public CashAccount? CashAccount { get; set; }
}
