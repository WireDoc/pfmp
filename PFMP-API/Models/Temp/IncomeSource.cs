using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class IncomeSource
{
    public int IncomeSourceId { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public int Type { get; set; }

    public int Frequency { get; set; }

    public decimal Amount { get; set; }

    public int Reliability { get; set; }

    public bool IsGuaranteed { get; set; }

    public bool IsActive { get; set; }

    public bool IsTaxable { get; set; }

    public bool IsW2income { get; set; }

    public bool Is1099Income { get; set; }

    public int? VadisabilityPercentage { get; set; }

    public bool IsVacombined { get; set; }

    public string? GovernmentAgency { get; set; }

    public string? GsPayScale { get; set; }

    public string? Symbol { get; set; }

    public decimal? DividendYield { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public DateTime? NextPaymentDate { get; set; }

    public decimal? AnnualGrowthRate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? Notes { get; set; }

    public virtual User User { get; set; } = null!;
}
