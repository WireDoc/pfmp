using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class TspProfile
{
    public int UserId { get; set; }

    public decimal ContributionRatePercent { get; set; }

    public decimal EmployerMatchPercent { get; set; }

    public decimal CurrentBalance { get; set; }

    public decimal TargetBalance { get; set; }

    public decimal GfundPercent { get; set; }

    public decimal FfundPercent { get; set; }

    public decimal CfundPercent { get; set; }

    public decimal SfundPercent { get; set; }

    public decimal IfundPercent { get; set; }

    public decimal? LifecycleBalance { get; set; }

    public decimal? LifecyclePercent { get; set; }

    public DateTime LastUpdatedAt { get; set; }

    public bool IsOptedOut { get; set; }

    public string? OptOutReason { get; set; }

    public DateTime? OptOutAcknowledgedAt { get; set; }

    public decimal? TotalBalance { get; set; }

    public virtual User User { get; set; } = null!;
}
