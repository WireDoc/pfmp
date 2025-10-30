using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileLongTermObligation
{
    public int LongTermObligationId { get; set; }

    public int UserId { get; set; }

    public string ObligationName { get; set; } = null!;

    public string ObligationType { get; set; } = null!;

    public DateTime? TargetDate { get; set; }

    public decimal? EstimatedCost { get; set; }

    public decimal? FundsAllocated { get; set; }

    public string? FundingStatus { get; set; }

    public bool IsCritical { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
