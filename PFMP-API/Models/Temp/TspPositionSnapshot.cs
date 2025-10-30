using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class TspPositionSnapshot
{
    public long Id { get; set; }

    public int UserId { get; set; }

    public string FundCode { get; set; } = null!;

    public decimal Price { get; set; }

    public decimal Units { get; set; }

    public decimal MarketValue { get; set; }

    public decimal MixPercent { get; set; }

    public decimal? AllocationPercent { get; set; }

    public DateTime AsOfUtc { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
