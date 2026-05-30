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

        /// <summary>
        /// Wave 14 P2.5: how often this paycheck arrives. Used together with
        /// <see cref="PerPeriodAmount"/> / <see cref="PerPeriodNetAmount"/> so users
        /// enter the LES figure directly (e.g. "$5,538.46 biweekly") and we derive
        /// <see cref="MonthlyAmount"/> / <see cref="MonthlyNetAmount"/> via
        /// the conversion factor (Weekly ×52/12, Biweekly ×26/12,
        /// Semimonthly ×2, Monthly ×1).
        /// </summary>
        public IncomeStreamFrequency AmountFrequency { get; set; } = IncomeStreamFrequency.Monthly;

        /// <summary>Per-paycheck gross amount as it appears on the user's LES /
        /// pay stub. When set, drives <see cref="MonthlyAmount"/> via the
        /// frequency factor. Null preserves legacy monthly-only entries.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PerPeriodAmount { get; set; }

        /// <summary>Per-paycheck net (take-home) amount. When set, drives
        /// <see cref="MonthlyNetAmount"/> via the frequency factor.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PerPeriodNetAmount { get; set; }

        /// <summary>Cadence of the allotment slice routed off this paycheck.
        /// Independent of <see cref="AmountFrequency"/> because a user may have
        /// a monthly direct deposit but a biweekly auto-transfer to savings.</summary>
        public IncomeStreamFrequency AllotmentFrequency { get; set; } = IncomeStreamFrequency.Monthly;

        /// <summary>Per-period allotment amount (e.g. "$450 every 2 weeks").
        /// Multiplied by the <see cref="AllotmentFrequency"/> factor to compute
        /// the monthly equivalent the dashboard surfaces.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AllotmentPerPeriodAmount { get; set; }

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
    /// Wave 14 P2.5: paycheck cadence used to convert per-period amounts to
    /// monthly equivalents. Conversion factors:
    /// <list type="bullet">
    ///   <item><c>Weekly</c>: × 52/12 ≈ × 4.3333 (52 paychecks/year)</item>
    ///   <item><c>Biweekly</c>: × 26/12 ≈ × 2.1667 (every other Friday — federal civilian)</item>
    ///   <item><c>Semimonthly</c>: × 2 (1st &amp; 15th — DFAS military pay)</item>
    ///   <item><c>Monthly</c>: × 1 (default; legacy behavior)</item>
    /// </list>
    /// Semimonthly (24 paychecks/year) is intentionally distinct from Biweekly
    /// (26 paychecks/year) — the two-week cadence drifts relative to the
    /// 1st/15th cadence, and military / civilian semimonthly users land on
    /// fixed calendar days.
    /// </summary>
    public enum IncomeStreamFrequency
    {
        Weekly,
        Biweekly,
        Semimonthly,
        Monthly,
    }

    /// <summary>
    /// Wave 14 P2.5 helper: maps a frequency enum to its monthly-conversion
    /// factor. Centralized so service code and tests share one source of truth.
    /// </summary>
    public static class IncomeStreamFrequencyExtensions
    {
        public static decimal MonthlyFactor(this IncomeStreamFrequency freq) => freq switch
        {
            IncomeStreamFrequency.Weekly => 52m / 12m,
            IncomeStreamFrequency.Biweekly => 26m / 12m,
            IncomeStreamFrequency.Semimonthly => 2m,
            IncomeStreamFrequency.Monthly => 1m,
            _ => 1m,
        };
    }

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
