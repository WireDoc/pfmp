using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Insurance policies including life, auto, property, disability, and health insurance
    /// </summary>
    public class Insurance
    {
        [Key]
        public int InsuranceId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string PolicyName { get; set; } = string.Empty;

        [Required]
        public InsuranceType Type { get; set; }

        [Required]
        [MaxLength(150)]
        public string InsuranceCompany { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? PolicyNumber { get; set; }

        // Coverage Information
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal CoverageAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? Deductible { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? OutOfPocketMax { get; set; }

        // Premium Information
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal PremiumAmount { get; set; }

        [Required]
        public PremiumFrequency PremiumFrequency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyPremium => CalculateMonthlyPremium();

        [Column(TypeName = "decimal(18,2)")]
        public decimal AnnualPremium => MonthlyPremium * 12;

        // Policy Dates
        [Required]
        public DateTime PolicyStartDate { get; set; }

        public DateTime? PolicyEndDate { get; set; }

        [Required]
        public DateTime RenewalDate { get; set; }

        public DateTime? LastPremiumPayment { get; set; }
        public DateTime? NextPremiumDue { get; set; }

        // Life Insurance Specific
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CashValue { get; set; } // For whole life policies

        [Column(TypeName = "decimal(8,4)")]
        public decimal? CashValueGrowthRate { get; set; }

        public bool IsTerm { get; set; } = true;
        public int? TermLengthYears { get; set; }

        [MaxLength(500)]
        public string? Beneficiaries { get; set; }

        // Auto Insurance Specific
        [MaxLength(100)]
        public string? VehicleDescription { get; set; }

        [MaxLength(17)]
        public string? VIN { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? VehicleValue { get; set; }

        // Property Insurance Specific
        [MaxLength(200)]
        public string? PropertyAddress { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PropertyValue { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ReplacementCost { get; set; }

        // Disability Insurance Specific
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyBenefit { get; set; }

        public int? BenefitPeriodMonths { get; set; }
        public int? WaitingPeriodDays { get; set; }

        // Health Insurance Specific
        [MaxLength(100)]
        public string? NetworkType { get; set; } // HMO, PPO, etc.

        public bool HasHSA { get; set; } = false;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? HSAContributionLimit { get; set; }

        // Status and Optimization
        public InsuranceStatus Status { get; set; } = InsuranceStatus.Active;
        public bool NeedsReview { get; set; } = false;
        public DateTime? LastReviewDate { get; set; }

        // Adequacy Analysis
        public bool IsAdequateCoverage { get; set; } = true;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RecommendedCoverageAmount { get; set; }

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        private decimal CalculateMonthlyPremium()
        {
            return PremiumFrequency switch
            {
                PremiumFrequency.Monthly => PremiumAmount,
                PremiumFrequency.Quarterly => PremiumAmount / 3m,
                PremiumFrequency.SemiAnnually => PremiumAmount / 6m,
                PremiumFrequency.Annually => PremiumAmount / 12m,
                _ => PremiumAmount
            };
        }
    }

    public enum InsuranceType
    {
        Life,
        Disability,
        Health,
        Auto,
        Homeowners,
        Renters,
        Umbrella,
        Professional,
        Travel,
        Other
    }

    public enum PremiumFrequency
    {
        Monthly,
        Quarterly,
        SemiAnnually,
        Annually
    }

    public enum InsuranceStatus
    {
        Active,
        Lapsed,
        Cancelled,
        UnderReview,
        PendingRenewal
    }
}