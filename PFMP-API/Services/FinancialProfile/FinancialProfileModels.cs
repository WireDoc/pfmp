using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Services.FinancialProfile
{
    public class SectionOptOut
    {
        public bool IsOptedOut { get; set; }
        public string? Reason { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
    }

    public class HouseholdProfileInput
    {
        [MaxLength(120)]
        public string? PreferredName { get; set; }
        [MaxLength(60)]
        public string? MaritalStatus { get; set; }
        public int? DependentCount { get; set; }
        [MaxLength(500)]
        public string? ServiceNotes { get; set; }
        public SectionOptOut? OptOut { get; set; }
    }

    public class RiskGoalsInput
    {
        public int? RiskTolerance { get; set; }
        public DateTime? TargetRetirementDate { get; set; }
        public decimal? PassiveIncomeGoal { get; set; }
        public decimal? LiquidityBufferMonths { get; set; }
        public decimal? EmergencyFundTarget { get; set; }
        public decimal? TransactionalAccountDesiredBalance { get; set; }
        public SectionOptOut? OptOut { get; set; }
    }

    public class TspAllocationInput
    {
        public decimal ContributionRatePercent { get; set; }
        public decimal EmployerMatchPercent { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal TargetBalance { get; set; }
        public decimal GFundPercent { get; set; }
        public decimal FFundPercent { get; set; }
        public decimal CFundPercent { get; set; }
        public decimal SFundPercent { get; set; }
        public decimal IFundPercent { get; set; }
        public decimal? LifecyclePercent { get; set; }
        public decimal? LifecycleBalance { get; set; }
        // Detailed lifecycle fund positions (e.g., L2030, L2035, ..., L2075)
        public List<TspLifecyclePositionInput> LifecyclePositions { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class TspLifecyclePositionInput
    {
        // Allowed values: G,F,C,S,I,L-INCOME, and lifecycle dated funds L2030..L2075
        [MaxLength(10)]
        public string FundCode { get; set; } = string.Empty;

        // Contribution percentage for this fund (0-100). Must sum to 100 across funds per user.
        public decimal ContributionPercent { get; set; }

        // Number of units/shares held in this fund
        public decimal Units { get; set; }

        // Optional timestamp if the client wants to push its last update moment
        public DateTime? DateUpdated { get; set; }
    }

    public class CashAccountInput
    {
        public string Nickname { get; set; } = string.Empty;
        public string AccountType { get; set; } = "checking";
        public string? Institution { get; set; }
        public decimal Balance { get; set; }
        public decimal? InterestRateApr { get; set; }
        public bool IsEmergencyFund { get; set; }
        public DateTime? RateLastChecked { get; set; }
        public string? Purpose { get; set; }
    }

    public class CashAccountsInput
    {
        public List<CashAccountInput> Accounts { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class InvestmentAccountInput
    {
        public string AccountName { get; set; } = string.Empty;
        public string AccountCategory { get; set; } = "brokerage";
        public string? Institution { get; set; }
        public string? AssetClass { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal? CostBasis { get; set; }
        public decimal? ContributionRatePercent { get; set; }
        public bool IsTaxAdvantaged { get; set; }
        public DateTime? LastContributionDate { get; set; }
    }

    public class InvestmentAccountsInput
    {
        public List<InvestmentAccountInput> Accounts { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class PropertyInput
    {
        public string PropertyName { get; set; } = string.Empty;
        public string PropertyType { get; set; } = "primary";
        public string Occupancy { get; set; } = "owner";
        public decimal EstimatedValue { get; set; }
        public decimal? MortgageBalance { get; set; }
        public decimal? MonthlyMortgagePayment { get; set; }
        public decimal? MonthlyRentalIncome { get; set; }
        public decimal? MonthlyExpenses { get; set; }
        public bool HasHeloc { get; set; }
    }

    public class PropertiesInput
    {
        public List<PropertyInput> Properties { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class InsurancePolicyInput
    {
        public string PolicyType { get; set; } = string.Empty;
        public string? Carrier { get; set; }
        public string? PolicyName { get; set; }
        public decimal? CoverageAmount { get; set; }
        public decimal? PremiumAmount { get; set; }
        public string? PremiumFrequency { get; set; }
        public DateTime? RenewalDate { get; set; }
        public bool IsAdequateCoverage { get; set; }
        public decimal? RecommendedCoverage { get; set; }
    }

    public class InsurancePoliciesInput
    {
        public List<InsurancePolicyInput> Policies { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class IncomeStreamInput
    {
        public string Name { get; set; } = string.Empty;
        public string IncomeType { get; set; } = "salary";
        public decimal? MonthlyAmount { get; set; }
        public decimal? AnnualAmount { get; set; }
        public bool IsGuaranteed { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class IncomeStreamsInput
    {
        public List<IncomeStreamInput> Streams { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class LiabilityAccountInput
    {
        public string LiabilityType { get; set; } = string.Empty;
        public string? Lender { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal? InterestRateApr { get; set; }
        public decimal? MinimumPayment { get; set; }
        public DateTime? PayoffTargetDate { get; set; }
        public bool IsPriorityToEliminate { get; set; }
    }

    public class LiabilitiesInput
    {
        public List<LiabilityAccountInput> Liabilities { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class ExpenseBudgetInput
    {
        public string Category { get; set; } = string.Empty;
        public decimal MonthlyAmount { get; set; }
        public bool IsEstimated { get; set; }
        public string? Notes { get; set; }
    }

    public class ExpensesInput
    {
        public List<ExpenseBudgetInput> Expenses { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class TaxProfileInput
    {
        public string FilingStatus { get; set; } = "single";
        public string? StateOfResidence { get; set; }
        public decimal? MarginalRatePercent { get; set; }
        public decimal? EffectiveRatePercent { get; set; }
        public decimal? FederalWithholdingPercent { get; set; }
        public decimal? ExpectedRefundAmount { get; set; }
        public decimal? ExpectedPaymentAmount { get; set; }
        public bool UsesCpaOrPreparer { get; set; }
        public string? Notes { get; set; }
        public SectionOptOut? OptOut { get; set; }
    }

    public class BenefitCoverageInput
    {
        public string BenefitType { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public bool IsEnrolled { get; set; }
        public decimal? EmployerContributionPercent { get; set; }
        public decimal? MonthlyCost { get; set; }
        public string? Notes { get; set; }
    }

    public class BenefitsInput
    {
        public List<BenefitCoverageInput> Benefits { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class LongTermObligationInput
    {
        public string ObligationName { get; set; } = string.Empty;
        public string ObligationType { get; set; } = "general";
        public DateTime? TargetDate { get; set; }
        public decimal? EstimatedCost { get; set; }
        public decimal? FundsAllocated { get; set; }
        public string? FundingStatus { get; set; }
        public bool IsCritical { get; set; }
        public string? Notes { get; set; }
    }

    public class LongTermObligationsInput
    {
        public List<LongTermObligationInput> Obligations { get; set; } = new();
        public SectionOptOut? OptOut { get; set; }
    }

    public class EquityInterestInput
    {
        public bool IsInterestedInTracking { get; set; }
        public string? Notes { get; set; }
        public SectionOptOut? OptOut { get; set; }
    }

    // TSP summary shapes
    public class TspSummary
    {
        public List<TspSummaryItem> Items { get; set; } = new();
        public decimal TotalMarketValue { get; set; }
        public DateTime AsOfUtc { get; set; } = DateTime.UtcNow;
    }

    public class TspSummaryItem
    {
        public string FundCode { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal Units { get; set; }
        public decimal MarketValue { get; set; }
        public decimal MixPercent { get; set; }
        public decimal? AllocationPercent { get; set; }
    }

    // Ultra-light summary optimized for quick UI reads from denormalized columns
    public class TspSummaryLite
    {
        public List<TspSummaryLiteItem> Items { get; set; } = new();
        public decimal? TotalBalance { get; set; }
        public DateTime? AsOfUtc { get; set; }
    }

    public class TspSummaryLiteItem
    {
        public string FundCode { get; set; } = string.Empty;
        public decimal? CurrentPrice { get; set; }
        public decimal Units { get; set; }
        public decimal? CurrentMarketValue { get; set; }
        public decimal? CurrentMixPercent { get; set; }
    }

    // Lightweight metadata about the latest captured TSP snapshot
    public class TspSnapshotMeta
    {
        public DateTime AsOfUtc { get; set; }
        public int FundCount { get; set; }
        public decimal TotalMarketValue { get; set; }
        public DateTime? CapturedAtUtc { get; set; }
    }

    /// <summary>
    /// Comprehensive TSP detail view response for the TSP Detail Page.
    /// Includes user positions AND all current fund prices (from stored data only - no API calls).
    /// </summary>
    public class TspDetailResponse
    {
        /// <summary>User's TSP positions with stored prices</summary>
        public List<TspSummaryLiteItem> Positions { get; set; } = new();
        
        /// <summary>All TSP fund prices from TSPFundPrices table (updated by TspPriceRefreshJob)</summary>
        public TspFundPricesSnapshot AllFundPrices { get; set; } = new();
        
        /// <summary>TSP profile info (contribution rates, total balance)</summary>
        public TspProfileInfo? Profile { get; set; }
        
        /// <summary>Total calculated market value from positions</summary>
        public decimal TotalMarketValue { get; set; }
        
        /// <summary>When prices were last updated by background job</summary>
        public DateTime? PricesAsOfUtc { get; set; }
    }

    /// <summary>
    /// Snapshot of all TSP fund prices from TSPFundPrices table
    /// </summary>
    public class TspFundPricesSnapshot
    {
        public DateTime PriceDate { get; set; }
        public decimal GFundPrice { get; set; }
        public decimal FFundPrice { get; set; }
        public decimal CFundPrice { get; set; }
        public decimal SFundPrice { get; set; }
        public decimal IFundPrice { get; set; }
        public decimal? LIncomeFundPrice { get; set; }
        public decimal? L2030FundPrice { get; set; }
        public decimal? L2035FundPrice { get; set; }
        public decimal? L2040FundPrice { get; set; }
        public decimal? L2045FundPrice { get; set; }
        public decimal? L2050FundPrice { get; set; }
        public decimal? L2055FundPrice { get; set; }
        public decimal? L2060FundPrice { get; set; }
        public decimal? L2065FundPrice { get; set; }
        public decimal? L2070FundPrice { get; set; }
        public decimal? L2075FundPrice { get; set; }
        public string? DataSource { get; set; }
    }

    /// <summary>
    /// TSP profile summary info for detail page
    /// </summary>
    public class TspProfileInfo
    {
        public decimal? ContributionRatePercent { get; set; }
        public decimal? EmployerMatchPercent { get; set; }
        public decimal? TotalBalance { get; set; }
        public decimal? TargetBalance { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
