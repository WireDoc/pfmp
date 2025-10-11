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
        public SectionOptOut? OptOut { get; set; }
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
        public decimal MonthlyAmount { get; set; }
        public decimal AnnualAmount { get; set; }
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
}
