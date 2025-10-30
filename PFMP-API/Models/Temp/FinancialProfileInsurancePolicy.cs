using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileInsurancePolicy
{
    public Guid InsurancePolicyId { get; set; }

    public int UserId { get; set; }

    public string PolicyType { get; set; } = null!;

    public string? Carrier { get; set; }

    public string? PolicyName { get; set; }

    public decimal? CoverageAmount { get; set; }

    public decimal? PremiumAmount { get; set; }

    public string? PremiumFrequency { get; set; }

    public DateTime? RenewalDate { get; set; }

    public bool IsAdequateCoverage { get; set; }

    public decimal? RecommendedCoverage { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
