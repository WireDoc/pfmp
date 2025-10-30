using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Transaction
{
    public int TransactionId { get; set; }

    public int AccountId { get; set; }

    public int? HoldingId { get; set; }

    public string TransactionType { get; set; } = null!;

    public string? Symbol { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? Price { get; set; }

    public decimal Amount { get; set; }

    public decimal? Fee { get; set; }

    public DateTime TransactionDate { get; set; }

    public DateTime SettlementDate { get; set; }

    public bool IsTaxable { get; set; }

    public bool IsLongTermCapitalGains { get; set; }

    public decimal? TaxableAmount { get; set; }

    public decimal? CostBasis { get; set; }

    public decimal? CapitalGainLoss { get; set; }

    public int Source { get; set; }

    public string? ExternalTransactionId { get; set; }

    public string? Description { get; set; }

    public bool IsDividendReinvestment { get; set; }

    public bool IsQualifiedDividend { get; set; }

    public decimal? StakingReward { get; set; }

    public decimal? StakingApy { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? Notes { get; set; }

    public virtual Account Account { get; set; } = null!;

    public virtual Holding? Holding { get; set; }
}
