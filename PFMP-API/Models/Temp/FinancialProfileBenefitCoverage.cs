using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileBenefitCoverage
{
    public int BenefitCoverageId { get; set; }

    public int UserId { get; set; }

    public string BenefitType { get; set; } = null!;

    public string? Provider { get; set; }

    public bool IsEnrolled { get; set; }

    public decimal? EmployerContributionPercent { get; set; }

    public decimal? MonthlyCost { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
