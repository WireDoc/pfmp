using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class RealEstateProperty
{
    public int RealEstateId { get; set; }

    public int UserId { get; set; }

    public string PropertyName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public int PropertyType { get; set; }

    public int Status { get; set; }

    public decimal PurchasePrice { get; set; }

    public DateTime PurchaseDate { get; set; }

    public decimal CurrentMarketValue { get; set; }

    public DateTime? LastAppraisalDate { get; set; }

    public decimal MortgageBalance { get; set; }

    public decimal MortgageInterestRate { get; set; }

    public DateTime? MortgageMaturityDate { get; set; }

    public decimal MonthlyMortgagePayment { get; set; }

    public decimal MonthlyRentalIncome { get; set; }

    public decimal MonthlyExpenses { get; set; }

    public decimal SecurityDeposit { get; set; }

    public DateTime? LeaseStartDate { get; set; }

    public DateTime? LeaseEndDate { get; set; }

    public int? SquareFootage { get; set; }

    public int? Bedrooms { get; set; }

    public int? Bathrooms { get; set; }

    public int? YearBuilt { get; set; }

    public decimal AnnualPropertyTaxes { get; set; }

    public decimal AnnualInsurance { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
