using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileLiability
{
    public int LiabilityAccountId { get; set; }

    public int UserId { get; set; }

    public string LiabilityType { get; set; } = null!;

    public string? Lender { get; set; }

    public decimal CurrentBalance { get; set; }

    public decimal? InterestRateApr { get; set; }

    public decimal? MinimumPayment { get; set; }

    public DateTime? PayoffTargetDate { get; set; }

    public bool IsPriorityToEliminate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
