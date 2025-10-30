using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class InsurancePolicy
{
    public int InsuranceId { get; set; }

    public int UserId { get; set; }

    public string PolicyName { get; set; } = null!;

    public int Type { get; set; }

    public string InsuranceCompany { get; set; } = null!;

    public string? PolicyNumber { get; set; }

    public decimal CoverageAmount { get; set; }

    public decimal? Deductible { get; set; }

    public decimal? OutOfPocketMax { get; set; }

    public decimal PremiumAmount { get; set; }

    public int PremiumFrequency { get; set; }

    public DateTime PolicyStartDate { get; set; }

    public DateTime? PolicyEndDate { get; set; }

    public DateTime RenewalDate { get; set; }

    public DateTime? LastPremiumPayment { get; set; }

    public DateTime? NextPremiumDue { get; set; }

    public decimal? CashValue { get; set; }

    public decimal? CashValueGrowthRate { get; set; }

    public bool IsTerm { get; set; }

    public int? TermLengthYears { get; set; }

    public string? Beneficiaries { get; set; }

    public string? VehicleDescription { get; set; }

    public string? Vin { get; set; }

    public decimal? VehicleValue { get; set; }

    public string? PropertyAddress { get; set; }

    public decimal? PropertyValue { get; set; }

    public decimal? ReplacementCost { get; set; }

    public decimal? MonthlyBenefit { get; set; }

    public int? BenefitPeriodMonths { get; set; }

    public int? WaitingPeriodDays { get; set; }

    public string? NetworkType { get; set; }

    public bool HasHsa { get; set; }

    public decimal? HsacontributionLimit { get; set; }

    public int Status { get; set; }

    public bool NeedsReview { get; set; }

    public DateTime? LastReviewDate { get; set; }

    public bool IsAdequateCoverage { get; set; }

    public decimal? RecommendedCoverageAmount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? Notes { get; set; }

    public virtual User User { get; set; } = null!;
}
