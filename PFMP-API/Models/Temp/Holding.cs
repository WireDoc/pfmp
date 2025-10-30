using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Holding
{
    public int HoldingId { get; set; }

    public int AccountId { get; set; }

    public string Symbol { get; set; } = null!;

    public string? Name { get; set; }

    public int AssetType { get; set; }

    public decimal Quantity { get; set; }

    public decimal AverageCostBasis { get; set; }

    public decimal CurrentPrice { get; set; }

    public decimal? AnnualDividendYield { get; set; }

    public decimal? StakingApy { get; set; }

    public decimal? AnnualDividendIncome { get; set; }

    public DateTime? LastDividendDate { get; set; }

    public DateTime? NextDividendDate { get; set; }

    public decimal? Beta { get; set; }

    public string? SectorAllocation { get; set; }

    public string? GeographicAllocation { get; set; }

    public bool IsQualifiedDividend { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public bool IsLongTermCapitalGains { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastPriceUpdate { get; set; }

    public string? Notes { get; set; }

    public virtual Account Account { get; set; } = null!;

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
