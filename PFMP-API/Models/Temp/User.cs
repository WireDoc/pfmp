using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class User
{
    public int UserId { get; set; }

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public int RiskTolerance { get; set; }

    public DateTime? LastRiskAssessment { get; set; }

    public decimal? RetirementGoalAmount { get; set; }

    public decimal? TargetMonthlyPassiveIncome { get; set; }

    public DateTime? TargetRetirementDate { get; set; }

    public decimal EmergencyFundTarget { get; set; }

    public decimal? VadisabilityMonthlyAmount { get; set; }

    public int? VadisabilityPercentage { get; set; }

    public bool IsGovernmentEmployee { get; set; }

    public string? GovernmentAgency { get; set; }

    public bool EnableRebalancingAlerts { get; set; }

    public decimal RebalancingThreshold { get; set; }

    public bool EnableTaxOptimization { get; set; }

    public bool EnablePushNotifications { get; set; }

    public bool EnableEmailAlerts { get; set; }

    public decimal? AnnualIncome { get; set; }

    public bool BypassAuthentication { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public string? EmploymentType { get; set; }

    public bool IsTestAccount { get; set; }

    public string? PayGrade { get; set; }

    public DateTime? ProfileCompletedAt { get; set; }

    public bool ProfileSetupComplete { get; set; }

    public string? RetirementSystem { get; set; }

    public DateTime? ServiceComputationDate { get; set; }

    public int SetupProgressPercentage { get; set; }

    public string? SetupStepsCompleted { get; set; }

    public DateTime? AccountLockedUntil { get; set; }

    public string? AzureObjectId { get; set; }

    public int FailedLoginAttempts { get; set; }

    public bool IsActive { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public string? PasswordHash { get; set; }

    public int? DependentCount { get; set; }

    public string? HouseholdServiceNotes { get; set; }

    public string? MaritalStatus { get; set; }

    public string? PreferredName { get; set; }

    public decimal? LiquidityBufferMonths { get; set; }

    public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();

    public virtual ICollection<Advice> Advices { get; set; } = new List<Advice>();

    public virtual ICollection<AiactionMemory> AiactionMemories { get; set; } = new List<AiactionMemory>();

    public virtual ICollection<Aiconversation> Aiconversations { get; set; } = new List<Aiconversation>();

    public virtual ICollection<AiuserMemory> AiuserMemories { get; set; } = new List<AiuserMemory>();

    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();

    public virtual ICollection<CashAccount> CashAccounts { get; set; } = new List<CashAccount>();

    public virtual ICollection<FinancialProfileBenefitCoverage> FinancialProfileBenefitCoverages { get; set; } = new List<FinancialProfileBenefitCoverage>();

    public virtual FinancialProfileEquityInterest? FinancialProfileEquityInterest { get; set; }

    public virtual ICollection<FinancialProfileExpense> FinancialProfileExpenses { get; set; } = new List<FinancialProfileExpense>();

    public virtual ICollection<FinancialProfileInsurancePolicy> FinancialProfileInsurancePolicies { get; set; } = new List<FinancialProfileInsurancePolicy>();

    public virtual ICollection<FinancialProfileLiability> FinancialProfileLiabilities { get; set; } = new List<FinancialProfileLiability>();

    public virtual ICollection<FinancialProfileLongTermObligation> FinancialProfileLongTermObligations { get; set; } = new List<FinancialProfileLongTermObligation>();

    public virtual ICollection<FinancialProfileSectionStatus> FinancialProfileSectionStatuses { get; set; } = new List<FinancialProfileSectionStatus>();

    public virtual FinancialProfileSnapshot? FinancialProfileSnapshot { get; set; }

    public virtual FinancialProfileTaxProfile? FinancialProfileTaxProfile { get; set; }

    public virtual ICollection<Goal> Goals { get; set; } = new List<Goal>();

    public virtual ICollection<IncomeSource> IncomeSources { get; set; } = new List<IncomeSource>();

    public virtual ICollection<IncomeStream> IncomeStreams { get; set; } = new List<IncomeStream>();

    public virtual ICollection<InsurancePolicy> InsurancePolicies { get; set; } = new List<InsurancePolicy>();

    public virtual ICollection<InvestmentAccount> InvestmentAccounts { get; set; } = new List<InvestmentAccount>();

    public virtual OnboardingProgress? OnboardingProgress { get; set; }

    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();

    public virtual ICollection<RealEstateProperty> RealEstateProperties { get; set; } = new List<RealEstateProperty>();

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();

    public virtual ICollection<TspLifecyclePosition> TspLifecyclePositions { get; set; } = new List<TspLifecyclePosition>();

    public virtual ICollection<TspPositionSnapshot> TspPositionSnapshots { get; set; } = new List<TspPositionSnapshot>();

    public virtual TspProfile? TspProfile { get; set; }
}
