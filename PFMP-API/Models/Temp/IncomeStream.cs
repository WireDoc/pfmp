using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class IncomeStream
{
    public Guid IncomeStreamId { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public string IncomeType { get; set; } = null!;

    public decimal MonthlyAmount { get; set; }

    public decimal AnnualAmount { get; set; }

    public bool IsGuaranteed { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
