using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("IncomeStreams")]
    public class IncomeStreamProfile
    {
        [Key]
        public Guid IncomeStreamId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string IncomeType { get; set; } = "salary";

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AnnualAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyNetAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AnnualNetAmount { get; set; }

        public bool IsGuaranteed { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        // Wave 14 P1 — allotment support (DFAS LES allotments, child support, etc.)
        public IncomeStreamAllotmentType AllotmentType { get; set; } = IncomeStreamAllotmentType.None;

        /// <summary>FK to <c>Account.AccountId</c> (investment) when
        /// AllotmentType=SavingsToLinkedAccount and the destination is an
        /// investment account. Set EITHER this OR
        /// <see cref="AllotmentDestinationCashAccountId"/>, never both.</summary>
        public int? AllotmentDestinationAccountId { get; set; }

        /// <summary>FK to <c>CashAccount.CashAccountId</c> (savings / money market /
        /// checking) when AllotmentType=SavingsToLinkedAccount and the destination
        /// is a cash account. Most DFAS savings allotments land in a savings or
        /// MM account, not a brokerage — so this is the common path.</summary>
        public Guid? AllotmentDestinationCashAccountId { get; set; }

        /// <summary>
        /// Wave 14 P2: which amount drives cash-flow inflow math — Net (take-home,
        /// after payroll deductions) or Gross (before deductions). Defaults to Net,
        /// since the dashboard's outflow side does NOT model payroll deductions
        /// (federal/state tax, FICA, TSP contributions, FEHB, FEGLI, etc.). Using
        /// gross without modeling those deductions overstates net cash flow.
        ///
        /// When set to Net and <see cref="MonthlyNetAmount"/> is null, the service
        /// falls back to <see cref="MonthlyAmount"/> and flags the row.
        /// </summary>
        public IncomeStreamCashFlowBasis CashFlowBasis { get; set; } = IncomeStreamCashFlowBasis.Net;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Wave 14: how an IncomeStream interacts with cash flow when it represents an
    /// LES-style allotment (paycheck-deducted amount routed elsewhere). Most income
    /// streams are <see cref="None"/> (regular income).
    /// </summary>
    /// <summary>
    /// Wave 14 P2: per-stream toggle deciding whether the gross or net amount is
    /// the source-of-truth for cash-flow inflow calculations.
    /// </summary>
    public enum IncomeStreamCashFlowBasis
    {
        /// <summary>Gross (pre-deduction) amount drives inflow. Use only if you
        /// model payroll deductions as separate outflows.</summary>
        Gross,
        /// <summary>Net / take-home amount drives inflow. Default; safe whether or
        /// not payroll deductions are modeled.</summary>
        Net,
    }

    public enum IncomeStreamAllotmentType
    {
        /// <summary>Regular income; counts as inflow.</summary>
        None,
        /// <summary>DFAS-style savings allotment to a PFMP-tracked account. Treated as
        /// internal transfer (neutral to net cash flow); informational only.</summary>
        SavingsToLinkedAccount,
        /// <summary>Allotment to an outside party (child support, support payments).
        /// Reduces net cash flow; appears in outflows breakdown.</summary>
        ExternalOutflow,
        /// <summary>Ambiguous allotment; counted as inflow but flagged with a note.</summary>
        Other,
    }
}
