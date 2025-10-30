using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class CashAccount
{
    public Guid CashAccountId { get; set; }

    public int UserId { get; set; }

    public string Nickname { get; set; } = null!;

    public string? Institution { get; set; }

    public string AccountType { get; set; } = null!;

    public decimal Balance { get; set; }

    public decimal? InterestRateApr { get; set; }

    public bool IsEmergencyFund { get; set; }

    public DateTime? RateLastChecked { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
