using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Property
{
    public Guid PropertyId { get; set; }

    public int UserId { get; set; }

    public string PropertyName { get; set; } = null!;

    public string PropertyType { get; set; } = null!;

    public string Occupancy { get; set; } = null!;

    public decimal EstimatedValue { get; set; }

    public decimal? MortgageBalance { get; set; }

    public decimal? MonthlyMortgagePayment { get; set; }

    public decimal? MonthlyRentalIncome { get; set; }

    public decimal? MonthlyExpenses { get; set; }

    public bool HasHeloc { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
