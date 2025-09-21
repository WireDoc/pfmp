using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Real estate property tracking for net worth calculation and rental income
    /// </summary>
    public class RealEstate
    {
        [Key]
        public int RealEstateId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string PropertyName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Address { get; set; } = string.Empty;

        [Required]
        public PropertyType PropertyType { get; set; }

        [Required]
        public PropertyStatus Status { get; set; }

        // Financial Information
        [Required]
        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }

        [Range(0, double.MaxValue)]
        public decimal CurrentMarketValue { get; set; }

        public DateTime? LastAppraisalDate { get; set; }

        // Mortgage Information
        [Range(0, double.MaxValue)]
        public decimal MortgageBalance { get; set; } = 0;

        [Range(0, 100)]
        public decimal MortgageInterestRate { get; set; } = 0;

        public DateTime? MortgageMaturityDate { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MonthlyMortgagePayment { get; set; } = 0;

        // Rental Information (if applicable)
        [Range(0, double.MaxValue)]
        public decimal MonthlyRentalIncome { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal MonthlyExpenses { get; set; } = 0; // Property taxes, insurance, maintenance, etc.

        public decimal SecurityDeposit { get; set; } = 0;

        public DateTime? LeaseStartDate { get; set; }
        public DateTime? LeaseEndDate { get; set; }

        // Property Details
        public int? SquareFootage { get; set; }
        public int? Bedrooms { get; set; }
        public int? Bathrooms { get; set; }
        public int? YearBuilt { get; set; }

        // Tax Information
        [Range(0, double.MaxValue)]
        public decimal AnnualPropertyTaxes { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal AnnualInsurance { get; set; } = 0;

        // Tracking
        [MaxLength(1000)]
        public string? Notes { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Calculated Properties
        public decimal MonthlyNetIncome => MonthlyRentalIncome - MonthlyExpenses - MonthlyMortgagePayment;
        public decimal AnnualNetIncome => MonthlyNetIncome * 12;
        public decimal NetWorthContribution => CurrentMarketValue - MortgageBalance;

        // Navigation Properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }

    public enum PropertyType
    {
        PrimaryResidence,
        RentalProperty,
        VacationHome,
        CommercialProperty,
        Land,
        Condo,
        Townhouse,
        SingleFamily,
        MultiFamily,
        Other
    }

    public enum PropertyStatus
    {
        Owned,
        ForSale,
        Rented,
        Vacant,
        UnderContract,
        Sold
    }
}