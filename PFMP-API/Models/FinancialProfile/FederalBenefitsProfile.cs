using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("FederalBenefitsProfiles")]
    public class FederalBenefitsProfile
    {
        [Key]
        public int FederalBenefitsProfileId { get; set; }

        [Required]
        public int UserId { get; set; }

        // === FERS Pension ===
        [Column(TypeName = "decimal(18,2)")]
        public decimal? High3AverageSalary { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ProjectedAnnuity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ProjectedMonthlyPension { get; set; }

        public int? CreditableYearsOfService { get; set; }

        public int? CreditableMonthsOfService { get; set; }

        public DateTime? MinimumRetirementAge { get; set; }

        public bool? IsEligibleForSpecialRetirementSupplement { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? EstimatedSupplementMonthly { get; set; }

        public int? SupplementEligibilityAge { get; set; } // Age when supplement starts (usually MRA)

        public int? SupplementEndAge { get; set; } // Always 62

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FersCumulativeRetirement { get; set; } // YTD cumulative FERS retirement contributions from LES

        // === FEGLI (Federal Employees' Group Life Insurance) ===
        public bool HasFegliBasic { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FegliBasicCoverage { get; set; }

        public bool HasFegliOptionA { get; set; }

        public bool HasFegliOptionB { get; set; }

        public int? FegliOptionBMultiple { get; set; } // 1-5x salary

        public bool HasFegliOptionC { get; set; }

        public int? FegliOptionCMultiple { get; set; } // 1-5 multiples

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FegliTotalMonthlyPremium { get; set; }

        // === FEHB (Federal Employees Health Benefits) ===
        [MaxLength(200)]
        public string? FehbPlanName { get; set; }

        [MaxLength(50)]
        public string? FehbCoverageLevel { get; set; } // Self, Self Plus One, Family

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FehbMonthlyPremium { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FehbEmployerContribution { get; set; }

        // === FEDVIP (Federal Employees Dental and Vision) ===
        public bool HasFedvipDental { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FedvipDentalMonthlyPremium { get; set; }

        public bool HasFedvipVision { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FedvipVisionMonthlyPremium { get; set; }

        // === FLTCIP (Federal Long Term Care Insurance) ===
        public bool HasFltcip { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FltcipMonthlyPremium { get; set; }

        // === FSA / HSA ===
        public bool HasFsa { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? FsaAnnualElection { get; set; }

        public bool HasHsa { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? HsaBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? HsaAnnualContribution { get; set; }

        // === SF-50 / LES Upload Metadata ===
        public DateTime? LastSf50UploadDate { get; set; }

        [MaxLength(200)]
        public string? LastSf50FileName { get; set; }

        public DateTime? LastLesUploadDate { get; set; }

        [MaxLength(200)]
        public string? LastLesFileName { get; set; }

        // === Timestamps ===
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
