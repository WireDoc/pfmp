using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    /// <summary>
    /// Income sources including salary, VA disability, dividends, rental income, etc.
    /// </summary>
    public class IncomeSource
    {
        [Key]
        public int IncomeSourceId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public IncomeType Type { get; set; }

        [Required]
        public IncomeFrequency Frequency { get; set; }

        // Amount Information
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal Amount { get; set; } // Per frequency period

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyAmount => CalculateMonthlyAmount();

        [Column(TypeName = "decimal(18,2)")]
        public decimal AnnualAmount => MonthlyAmount * 12;

        // Reliability and Planning
        public IncomeReliability Reliability { get; set; } = IncomeReliability.Variable;
        public bool IsGuaranteed { get; set; } = false; // VA disability, pension
        public bool IsActive { get; set; } = true;

        // Tax Information
        public bool IsTaxable { get; set; } = true;
        public bool IsW2Income { get; set; } = false;
        public bool Is1099Income { get; set; } = false;

        // VA Disability Specific
        public int? VADisabilityPercentage { get; set; }
        public bool IsVACombined { get; set; } = false;

        // Government Employment Specific
        [MaxLength(100)]
        public string? GovernmentAgency { get; set; }
        public string? GS_PayScale { get; set; } // GS-12, GS-13, etc.

        // Investment Income Specific
        [MaxLength(20)]
        public string? Symbol { get; set; } // For dividend tracking
        public decimal? DividendYield { get; set; }

        // Dates
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? NextPaymentDate { get; set; }

        // Growth Projections
        [Column(TypeName = "decimal(8,4)")]
        public decimal? AnnualGrowthRate { get; set; } // COLAs, raises

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("UserId")]
        [JsonIgnore] // Prevent circular reference in JSON serialization
        public virtual User? User { get; set; }

        private decimal CalculateMonthlyAmount()
        {
            return Frequency switch
            {
                IncomeFrequency.Weekly => Amount * 4.33m,
                IncomeFrequency.BiWeekly => Amount * 2.17m,
                IncomeFrequency.SemiMonthly => Amount * 2m,
                IncomeFrequency.Monthly => Amount,
                IncomeFrequency.Quarterly => Amount / 3m,
                IncomeFrequency.SemiAnnually => Amount / 6m,
                IncomeFrequency.Annually => Amount / 12m,
                _ => Amount
            };
        }
    }

    public enum IncomeType
    {
        // Employment
        Salary,
        Wages,
        Bonus,
        Commission,
        Tips,
        
        // Government Benefits
        VADisability,
        SocialSecurity,
        Pension,
        TSPWithdrawal,
        
        // Investment Income
        Dividends,
        Interest,
        CapitalGains,
        CryptoStaking,
        RentalIncome,
        
        // Business Income
        SelfEmployment,
        BusinessProfit,
        Consulting,
        Freelance,
        
        // Other
        AlimonyChild,
        UnemploymentInsurance,
        DisabilityInsurance,
        Other
    }

    public enum IncomeFrequency
    {
        Weekly,
        BiWeekly,
        SemiMonthly,
        Monthly,
        Quarterly,
        SemiAnnually,
        Annually
    }

    public enum IncomeReliability
    {
        Guaranteed, // VA disability, pension
        Stable, // Salary, regular employment
        Predictable, // Regular dividends
        Variable, // Commission, bonus
        Seasonal, // Seasonal work
        Irregular, // Freelance, capital gains
        Uncertain // Speculative income
    }
}