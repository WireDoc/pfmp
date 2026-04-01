using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("Properties")]
    public class PropertyProfile
    {
        [Key]
        public Guid PropertyId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string PropertyName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string PropertyType { get; set; } = "primary";

        [MaxLength(60)]
        public string Occupancy { get; set; } = "owner";

        [Column(TypeName = "decimal(18,2)")]
        public decimal EstimatedValue { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MortgageBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyMortgagePayment { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyRentalIncome { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyExpenses { get; set; }

        public bool HasHeloc { get; set; }

        // --- Mortgage Detail Fields (Wave 15.1) ---

        /// <summary>
        /// Mortgage interest rate (APR) for manual properties.
        /// Plaid-linked properties get this from the linked LiabilityAccount.
        /// </summary>
        [Column(TypeName = "decimal(8,4)")]
        public decimal? InterestRate { get; set; }

        /// <summary>
        /// Mortgage term in years (e.g., 15, 20, 30).
        /// </summary>
        public int? MortgageTerm { get; set; }

        /// <summary>
        /// Mortgage lender/lienholder name (e.g., "Navy Federal", "Wells Fargo").
        /// </summary>
        [MaxLength(150)]
        public string? Lienholder { get; set; }

        /// <summary>
        /// Monthly property tax amount.
        /// If PropertyTaxFrequency is "annual", this stores the annual amount;
        /// the cash flow calculation normalizes to monthly automatically.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyPropertyTax { get; set; }

        /// <summary>
        /// How the property tax amount was entered: "monthly" or "annual".
        /// </summary>
        [MaxLength(20)]
        public string PropertyTaxFrequency { get; set; } = "monthly";

        /// <summary>
        /// Monthly homeowner's insurance premium.
        /// If InsuranceFrequency is "annual", this stores the annual amount;
        /// the cash flow calculation normalizes to monthly automatically.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyInsurance { get; set; }

        /// <summary>
        /// How the insurance amount was entered: "monthly" or "annual".
        /// </summary>
        [MaxLength(20)]
        public string InsuranceFrequency { get; set; } = "monthly";

        /// <summary>
        /// Estimated mortgage payoff date (month/year).
        /// </summary>
        public DateTime? EstimatedPayoffDate { get; set; }

        /// <summary>
        /// Owner notes — strategy, plans, context for AI analysis.
        /// E.g., "Primary residence, considering refinancing when rates drop below 5%"
        /// </summary>
        [MaxLength(500)]
        public string? Purpose { get; set; }

        // --- End Mortgage Detail Fields ---

        // --- Plaid Integration Fields ---
        public AccountSource Source { get; set; } = AccountSource.Manual;

        /// <summary>
        /// Links this property to a mortgage liability from Plaid.
        /// </summary>
        public int? LinkedMortgageLiabilityId { get; set; }

        /// <summary>
        /// Property address from Plaid mortgage data.
        /// </summary>
        [MaxLength(200)]
        public string? Street { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(50)]
        public string? State { get; set; }

        [MaxLength(20)]
        public string? PostalCode { get; set; }

        /// <summary>
        /// When this property was last synced from Plaid.
        /// </summary>
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>
        /// Sync status: "synced", "error", "pending".
        /// </summary>
        [MaxLength(20)]
        public string? SyncStatus { get; set; }

        // --- End Plaid Integration Fields ---

        // --- Valuation Fields (Wave 15) ---

        /// <summary>
        /// Whether automatic valuation refreshes are enabled for this property.
        /// </summary>
        public bool AutoValuationEnabled { get; set; } = true;

        /// <summary>
        /// When the last automatic valuation was fetched.
        /// </summary>
        public DateTime? LastValuationAt { get; set; }

        /// <summary>
        /// Provider that last supplied a valuation (e.g., "estated", "manual").
        /// </summary>
        [MaxLength(50)]
        public string? ValuationSource { get; set; }

        /// <summary>
        /// Provider confidence score (0-1) for the last valuation.
        /// </summary>
        [Column(TypeName = "decimal(5,4)")]
        public decimal? ValuationConfidence { get; set; }

        /// <summary>
        /// Low-end estimate from the valuation provider.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? ValuationLow { get; set; }

        /// <summary>
        /// High-end estimate from the valuation provider.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? ValuationHigh { get; set; }

        /// <summary>
        /// Whether the address has been validated/standardized.
        /// </summary>
        public bool AddressValidated { get; set; }

        // --- End Valuation Fields ---

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
