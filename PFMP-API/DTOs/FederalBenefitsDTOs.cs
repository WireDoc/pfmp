namespace PFMP_API.DTOs;

public class FederalBenefitsResponse
{
    public int FederalBenefitsProfileId { get; set; }
    public int UserId { get; set; }

    // FERS Pension
    public decimal? High3AverageSalary { get; set; }
    public decimal? ProjectedAnnuity { get; set; }
    public decimal? ProjectedMonthlyPension { get; set; }
    public int? CreditableYearsOfService { get; set; }
    public int? CreditableMonthsOfService { get; set; }
    public DateTime? MinimumRetirementAge { get; set; }
    public bool? IsEligibleForSpecialRetirementSupplement { get; set; }
    public decimal? EstimatedSupplementMonthly { get; set; }
    public int? SupplementEligibilityAge { get; set; }
    public int? SupplementEndAge { get; set; }
    public decimal? FersCumulativeRetirement { get; set; }
    public decimal? SocialSecurityEstimateAt62 { get; set; }
    public decimal? AnnualSalaryGrowthRate { get; set; }

    // FEGLI
    public bool HasFegliBasic { get; set; }
    public decimal? FegliBasicCoverage { get; set; }
    public bool HasFegliOptionA { get; set; }
    public bool HasFegliOptionB { get; set; }
    public int? FegliOptionBMultiple { get; set; }
    public bool HasFegliOptionC { get; set; }
    public int? FegliOptionCMultiple { get; set; }
    public decimal? FegliTotalMonthlyPremium { get; set; }

    // FEHB
    public string? FehbPlanName { get; set; }
    public string? FehbCoverageLevel { get; set; }
    public decimal? FehbMonthlyPremium { get; set; }
    public decimal? FehbEmployerContribution { get; set; }

    // FEDVIP
    public bool HasFedvipDental { get; set; }
    public decimal? FedvipDentalMonthlyPremium { get; set; }
    public bool HasFedvipVision { get; set; }
    public decimal? FedvipVisionMonthlyPremium { get; set; }

    // FLTCIP
    public bool HasFltcip { get; set; }
    public decimal? FltcipMonthlyPremium { get; set; }

    // FSA / HSA
    public bool HasFsa { get; set; }
    public decimal? FsaAnnualElection { get; set; }
    public bool HasHsa { get; set; }
    public decimal? HsaBalance { get; set; }
    public decimal? HsaAnnualContribution { get; set; }

    // Upload metadata
    public DateTime? LastSf50UploadDate { get; set; }
    public string? LastSf50FileName { get; set; }
    public DateTime? LastLesUploadDate { get; set; }
    public string? LastLesFileName { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SaveFederalBenefitsRequest
{
    // FERS Pension
    public decimal? High3AverageSalary { get; set; }
    public decimal? ProjectedAnnuity { get; set; }
    public decimal? ProjectedMonthlyPension { get; set; }
    public int? CreditableYearsOfService { get; set; }
    public int? CreditableMonthsOfService { get; set; }
    public DateTime? MinimumRetirementAge { get; set; }
    public bool? IsEligibleForSpecialRetirementSupplement { get; set; }
    public decimal? EstimatedSupplementMonthly { get; set; }
    public int? SupplementEligibilityAge { get; set; }
    public int? SupplementEndAge { get; set; }
    public decimal? FersCumulativeRetirement { get; set; }
    public decimal? SocialSecurityEstimateAt62 { get; set; }
    public decimal? AnnualSalaryGrowthRate { get; set; }

    // FEGLI
    public bool HasFegliBasic { get; set; }
    public decimal? FegliBasicCoverage { get; set; }
    public bool HasFegliOptionA { get; set; }
    public bool HasFegliOptionB { get; set; }
    public int? FegliOptionBMultiple { get; set; }
    public bool HasFegliOptionC { get; set; }
    public int? FegliOptionCMultiple { get; set; }
    public decimal? FegliTotalMonthlyPremium { get; set; }

    // FEHB
    public string? FehbPlanName { get; set; }
    public string? FehbCoverageLevel { get; set; }
    public decimal? FehbMonthlyPremium { get; set; }
    public decimal? FehbEmployerContribution { get; set; }

    // FEDVIP
    public bool HasFedvipDental { get; set; }
    public decimal? FedvipDentalMonthlyPremium { get; set; }
    public bool HasFedvipVision { get; set; }
    public decimal? FedvipVisionMonthlyPremium { get; set; }

    // FLTCIP
    public bool HasFltcip { get; set; }
    public decimal? FltcipMonthlyPremium { get; set; }

    // FSA / HSA
    public bool HasFsa { get; set; }
    public decimal? FsaAnnualElection { get; set; }
    public bool HasHsa { get; set; }
    public decimal? HsaBalance { get; set; }
    public decimal? HsaAnnualContribution { get; set; }
}

public class Sf50UploadResponse
{
    public bool ParsedSuccessfully { get; set; }
    public string? ErrorMessage { get; set; }
    public int FieldsExtracted { get; set; }

    // Parsed fields the user can review before saving
    public string? PayGrade { get; set; }
    public decimal? AnnualBasicPay { get; set; }
    public string? PayBasis { get; set; }
    public string? Agency { get; set; }
    public string? RetirementPlan { get; set; }
    public DateTime? ServiceComputationDate { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? PositionTitle { get; set; }
    public string? FegliCode { get; set; }
}

public class LesUploadResponse
{
    public bool ParsedSuccessfully { get; set; }
    public string? ErrorMessage { get; set; }
    public int FieldsExtracted { get; set; }

    // Pay info
    public string? PayPeriod { get; set; }
    public string? PayGrade { get; set; }
    public decimal? AnnualBasicPay { get; set; }
    public decimal? BiweeklyGross { get; set; }
    public decimal? BiweeklyNet { get; set; }

    // Benefit deductions (biweekly amounts)
    public decimal? FegliDeduction { get; set; }
    public string? FegliBasicCode { get; set; }
    public decimal? FegliOptionalDeduction { get; set; }
    public string? FegliOptionalCode { get; set; }
    public decimal? FehbDeduction { get; set; }
    public decimal? FedvipDentalDeduction { get; set; }
    public decimal? FedvipVisionDeduction { get; set; }
    public decimal? FltcipDeduction { get; set; }
    public decimal? FsaDeduction { get; set; }
    public decimal? HsaDeduction { get; set; }

    // TSP
    public decimal? TspEmployeeDeduction { get; set; }
    public decimal? TspRothDeduction { get; set; }
    public decimal? TspCatchUpDeduction { get; set; }
    public decimal? TspAgencyMatch { get; set; }

    // Tax / retirement
    public decimal? RetirementDeduction { get; set; }
    public decimal? FersCumulativeRetirement { get; set; }
    public decimal? FederalTaxWithholding { get; set; }
    public decimal? StateTaxWithholding { get; set; }
    public decimal? OasdiDeduction { get; set; }
    public decimal? MedicareDeduction { get; set; }

    // Leave
    public decimal? AnnualLeaveBalance { get; set; }
    public decimal? SickLeaveBalance { get; set; }
}

public class RetirementProjectionResponse
{
    public List<RetirementScenario> Scenarios { get; set; } = new();
    public RetirementProjectionInputs Inputs { get; set; } = new();
}

public class RetirementScenario
{
    public string Label { get; set; } = string.Empty; // e.g. "MRA + 30", "Age 60 + 20", "Age 62"
    public int RetirementAge { get; set; }
    public int RetirementAgeMonths { get; set; } // additional months beyond RetirementAge
    public int ProjectedServiceYears { get; set; }
    public int ProjectedServiceMonths { get; set; }
    public decimal Multiplier { get; set; } // 0.01 or 0.011
    public decimal ProjectedHigh3 { get; set; }
    public decimal AnnualAnnuity { get; set; }
    public decimal MonthlyPension { get; set; }
    public bool SupplementEligible { get; set; }
    public decimal MonthlySupplementEstimate { get; set; } // FERS SRS estimate
    public int? SupplementMonths { get; set; } // months of supplement payments
    public decimal TotalMonthlyRetirementIncome { get; set; } // pension + supplement (pre-62) or pension + SS (post-62)
    public decimal? SocialSecurityMonthly { get; set; } // null if not provided
    // TSP projection (4% safe withdrawal rate)
    public decimal? ProjectedTspBalance { get; set; } // projected TSP balance at retirement
    public decimal? MonthlyTspWithdrawal { get; set; } // 4% rule: balance * 0.04 / 12
    public bool IsEligible { get; set; } // whether the user can retire at this point
    public string? EligibilityNote { get; set; } // e.g. "Reduced annuity (5% per year under MRA)"
}

public class RetirementProjectionInputs
{
    public decimal? High3AverageSalary { get; set; }
    public decimal? AnnualSalaryGrowthRate { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public DateTime? ServiceComputationDate { get; set; }
    public decimal? SocialSecurityEstimateAt62 { get; set; }
    public int? CurrentCreditableYears { get; set; }
    public int? CurrentCreditableMonths { get; set; }
    public DateTime? MinimumRetirementAge { get; set; }
    // TSP inputs
    public decimal? CurrentTspBalance { get; set; }
    public decimal? TspContributionRatePercent { get; set; }
    public decimal? TspEmployerMatchPercent { get; set; }
    public decimal? TspAnnualGrowthRate { get; set; } // default 7%
}
