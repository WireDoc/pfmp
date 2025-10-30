using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class MarketContext
{
    public int MarketContextId { get; set; }

    public DateTime ContextDate { get; set; }

    public string DailySummary { get; set; } = null!;

    public string MarketSentiment { get; set; } = null!;

    public string MajorEvents { get; set; } = null!;

    public string AffectedSectors { get; set; } = null!;

    public decimal Spychange { get; set; }

    public decimal Vixlevel { get; set; }

    public string? CryptoSentiment { get; set; }

    public string? TreasuryYield10Y { get; set; }

    public DateTime GeneratedAt { get; set; }

    public int TokensUsed { get; set; }

    public decimal GenerationCost { get; set; }

    public int SourceArticleCount { get; set; }

    public string? ModelUsed { get; set; }

    public virtual ICollection<Advice> Advices { get; set; } = new List<Advice>();

    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
