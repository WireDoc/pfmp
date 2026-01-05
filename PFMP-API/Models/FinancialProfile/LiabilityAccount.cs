using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FinancialProfileLiabilities")]
    public class LiabilityAccount
    {
        [Key]
        public int LiabilityAccountId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(80)]
        public string LiabilityType { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Lender { get; set; }

        // --- Plaid Integration Fields ---
        public AccountSource Source { get; set; } = AccountSource.Manual;

        /// <summary>
        /// The Plaid Item ID for linked accounts.
        /// </summary>
        [MaxLength(100)]
        public string? PlaidItemId { get; set; }

        /// <summary>
        /// The Plaid Account ID for linked accounts.
        /// </summary>
        [MaxLength(100)]
        public string? PlaidAccountId { get; set; }

        /// <summary>
        /// When this liability was last synced from Plaid.
        /// </summary>
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>
        /// Sync status: "synced", "error", "pending".
        /// </summary>
        [MaxLength(20)]
        public string? SyncStatus { get; set; }

        /// <summary>
        /// Whether a payment is past the due date.
        /// </summary>
        public bool IsOverdue { get; set; } = false;

        /// <summary>
        /// Days until payment is due (null if no due date).
        /// </summary>
        public int? DaysUntilDue { get; set; }

        /// <summary>
        /// Last payment amount received from Plaid.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? LastPaymentAmount { get; set; }

        /// <summary>
        /// Last payment date from Plaid.
        /// </summary>
        public DateTime? LastPaymentDate { get; set; }

        /// <summary>
        /// Next payment due date from Plaid.
        /// </summary>
        public DateTime? NextPaymentDueDate { get; set; }

        /// <summary>
        /// Year-to-date interest paid (mortgages/loans).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? YtdInterestPaid { get; set; }

        /// <summary>
        /// Year-to-date principal paid (mortgages/loans).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? YtdPrincipalPaid { get; set; }

        /// <summary>
        /// Escrow balance for mortgages.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? EscrowBalance { get; set; }

        // --- End Plaid Integration Fields ---

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentBalance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? InterestRateApr { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MinimumPayment { get; set; }

        public DateTime? PayoffTargetDate { get; set; }

        public bool IsPriorityToEliminate { get; set; }

        // Loan-specific fields for amortization
        [Column(TypeName = "decimal(18,2)")]
        public decimal? OriginalLoanAmount { get; set; }

        public int? LoanTermMonths { get; set; }

        public DateTime? LoanStartDate { get; set; }

        // Credit card-specific fields
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CreditLimit { get; set; }

        public DateTime? PaymentDueDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? StatementBalance { get; set; }

        public DateTime? StatementDate { get; set; }

        // Convenience properties
        public bool IsLoan => NormalizedType switch
        {
            "mortgage" => true,
            "auto_loan" => true,
            "autoloan" => true,
            "personal_loan" => true,
            "personalloan" => true,
            "student_loan" => true,
            "studentloan" => true,
            _ => false
        };

        public bool IsCreditCard => NormalizedType == "credit_card" || NormalizedType == "creditcard";

        // Normalize type for consistent comparison (handles hyphen vs underscore, camelCase, etc.)
        private string NormalizedType => LiabilityType?.ToLowerInvariant().Replace("-", "_") ?? "";

        // Calculated properties
        public decimal? CreditUtilization => CreditLimit > 0 ? CurrentBalance / CreditLimit * 100 : null;

        public int? MonthsRemaining => LoanTermMonths.HasValue && LoanStartDate.HasValue
            ? Math.Max(0, LoanTermMonths.Value - (int)Math.Floor((DateTime.UtcNow - LoanStartDate.Value).TotalDays / 30.44))
            : null;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
