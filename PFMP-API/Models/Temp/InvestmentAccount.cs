using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class InvestmentAccount
{
    public Guid InvestmentAccountId { get; set; }

    public int UserId { get; set; }

    public string AccountName { get; set; } = null!;

    public string? Institution { get; set; }

    public string AccountCategory { get; set; } = null!;

    public string? AssetClass { get; set; }

    public decimal CurrentValue { get; set; }

    public decimal? CostBasis { get; set; }

    public decimal? ContributionRatePercent { get; set; }

    public bool IsTaxAdvantaged { get; set; }

    public DateTime? LastContributionDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
