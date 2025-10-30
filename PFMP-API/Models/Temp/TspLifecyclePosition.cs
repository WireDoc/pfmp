using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class TspLifecyclePosition
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string FundCode { get; set; } = null!;

    public decimal ContributionPercent { get; set; }

    public decimal Units { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public decimal? CurrentMarketValue { get; set; }

    public decimal? CurrentMixPercent { get; set; }

    public decimal? CurrentPrice { get; set; }

    public DateTime? LastPricedAsOfUtc { get; set; }

    public DateTime? DateUpdated { get; set; }

    public virtual User User { get; set; } = null!;
}
