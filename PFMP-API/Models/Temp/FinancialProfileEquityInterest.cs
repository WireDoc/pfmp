using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileEquityInterest
{
    public int UserId { get; set; }

    public bool IsInterestedInTracking { get; set; }

    public string? Notes { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
