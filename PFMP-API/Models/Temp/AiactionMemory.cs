using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class AiactionMemory
{
    public int ActionMemoryId { get; set; }

    public int UserId { get; set; }

    public DateTime ActionDate { get; set; }

    public string ActionType { get; set; } = null!;

    public string ActionSummary { get; set; } = null!;

    public int? SourceAdviceId { get; set; }

    public int? SourceAlertId { get; set; }

    public string? AccountsAffected { get; set; }

    public decimal? AmountMoved { get; set; }

    public string? AssetClass { get; set; }

    public DateTime ExpiresAt { get; set; }

    public bool IsSignificant { get; set; }

    public bool Referenced { get; set; }

    public int ReferenceCount { get; set; }

    public virtual Advice? SourceAdvice { get; set; }

    public virtual Alert? SourceAlert { get; set; }

    public virtual User User { get; set; } = null!;
}
