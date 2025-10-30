using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Account
{
    public int AccountId { get; set; }

    public int UserId { get; set; }

    public string AccountName { get; set; } = null!;

    public int AccountType { get; set; }

    public int Category { get; set; }

    public string? Institution { get; set; }

    public string? AccountNumber { get; set; }

    public decimal CurrentBalance { get; set; }

    public decimal? InterestRate { get; set; }

    public DateTime? InterestRateUpdatedAt { get; set; }

    public bool HasApiintegration { get; set; }

    public string? Apiprovider { get; set; }

    public bool IsApiconnected { get; set; }

    public DateTime? LastApisync { get; set; }

    public string? ApiconnectionStatus { get; set; }

    public decimal? TspmonthlyContribution { get; set; }

    public decimal? TspemployerMatch { get; set; }

    public decimal? TspGfundPercentage { get; set; }

    public decimal? TspFfundPercentage { get; set; }

    public decimal? TspCfundPercentage { get; set; }

    public decimal? TspSfundPercentage { get; set; }

    public decimal? TspIfundPercentage { get; set; }

    public DateTime? TspLastUpdated { get; set; }

    public bool IsEmergencyFund { get; set; }

    public decimal? OptimalInterestRate { get; set; }

    public DateTime? RateLastChecked { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastBalanceUpdate { get; set; }

    public bool IsActive { get; set; }

    public string? Notes { get; set; }

    public decimal? TspallocationL2030fundPercentage { get; set; }

    public decimal? TspallocationL2035fundPercentage { get; set; }

    public decimal? TspallocationL2040fundPercentage { get; set; }

    public decimal? TspallocationL2045fundPercentage { get; set; }

    public decimal? TspallocationL2050fundPercentage { get; set; }

    public decimal? TspallocationL2055fundPercentage { get; set; }

    public decimal? TspallocationL2060fundPercentage { get; set; }

    public decimal? TspallocationL2065fundPercentage { get; set; }

    public decimal? TspallocationL2070fundPercentage { get; set; }

    public decimal? TspallocationL2075fundPercentage { get; set; }

    public decimal? TspallocationLincomeFundPercentage { get; set; }

    public virtual Apicredential? Apicredential { get; set; }

    public virtual ICollection<Holding> Holdings { get; set; } = new List<Holding>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();

    public virtual User User { get; set; } = null!;
}
