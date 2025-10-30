using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileSnapshot
{
    public int UserId { get; set; }

    public decimal CompletionPercent { get; set; }

    public int CompletedSectionCount { get; set; }

    public int OptedOutSectionCount { get; set; }

    public int OutstandingSectionCount { get; set; }

    public DateTime? ProfileCompletedAt { get; set; }

    public decimal NetWorthEstimate { get; set; }

    public decimal MonthlyCashFlowEstimate { get; set; }

    public string? CompletedSectionsJson { get; set; }

    public string? OptedOutSectionsJson { get; set; }

    public string? OutstandingSectionsJson { get; set; }

    public DateTime CalculatedAt { get; set; }

    public decimal? EffectiveTaxRatePercent { get; set; }

    public decimal? FederalWithholdingPercent { get; set; }

    public int LongTermObligationCount { get; set; }

    public decimal LongTermObligationEstimate { get; set; }

    public decimal? MarginalTaxRatePercent { get; set; }

    public decimal MonthlyDebtServiceEstimate { get; set; }

    public decimal MonthlyExpenseEstimate { get; set; }

    public DateTime? NextObligationDueDate { get; set; }

    public decimal TotalLiabilityBalance { get; set; }

    public bool UsesCpaOrPreparer { get; set; }

    public virtual User User { get; set; } = null!;
}
