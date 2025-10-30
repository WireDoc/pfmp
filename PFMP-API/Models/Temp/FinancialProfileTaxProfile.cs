using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileTaxProfile
{
    public int UserId { get; set; }

    public string FilingStatus { get; set; } = null!;

    public string? StateOfResidence { get; set; }

    public decimal? MarginalRatePercent { get; set; }

    public decimal? EffectiveRatePercent { get; set; }

    public decimal? FederalWithholdingPercent { get; set; }

    public decimal? ExpectedRefundAmount { get; set; }

    public decimal? ExpectedPaymentAmount { get; set; }

    public bool UsesCpaOrPreparer { get; set; }

    public string? Notes { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
