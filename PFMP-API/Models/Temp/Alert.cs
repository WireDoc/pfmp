using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Alert
{
    public int AlertId { get; set; }

    public int UserId { get; set; }

    public string Title { get; set; } = null!;

    public string Message { get; set; } = null!;

    public int Severity { get; set; }

    public int Category { get; set; }

    public bool IsRead { get; set; }

    public bool IsActionable { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public string? ActionUrl { get; set; }

    public string? Metadata { get; set; }

    public DateTime? DismissedAt { get; set; }

    public bool IsDismissed { get; set; }

    public int PortfolioImpactScore { get; set; }

    public bool Aianalyzed { get; set; }

    public DateTime? AianalyzedAt { get; set; }

    public string? Aicontext { get; set; }

    public int? MarketContextId { get; set; }

    public virtual ICollection<AiactionMemory> AiactionMemories { get; set; } = new List<AiactionMemory>();

    public virtual MarketContext? MarketContext { get; set; }

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();

    public virtual User User { get; set; } = null!;
}
