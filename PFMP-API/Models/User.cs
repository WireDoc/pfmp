using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Core user entity representing the government employee using the PFMP system
    /// </summary>
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Risk Assessment
        public int RiskTolerance { get; set; } = 5; // 1-10 scale
        public DateTime? LastRiskAssessment { get; set; }

        // Retirement Planning
        [Column(TypeName = "decimal(18,2)")]
        public decimal? RetirementGoalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TargetMonthlyPassiveIncome { get; set; }

        public DateTime? TargetRetirementDate { get; set; }

        // Emergency Fund
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal EmergencyFundTarget { get; set; }

        // VA Disability - Guaranteed Income
        [Column(TypeName = "decimal(18,2)")]
        public decimal? VADisabilityMonthlyAmount { get; set; }

        public int? VADisabilityPercentage { get; set; } // 0-100%

        // Government Employment
        public bool IsGovernmentEmployee { get; set; } = true;
        public string? GovernmentAgency { get; set; }

        // Preferences
        public bool EnableRebalancingAlerts { get; set; } = true;
        public decimal RebalancingThreshold { get; set; } = 5.0m; // Default 5% drift
        public bool EnableTaxOptimization { get; set; } = true;
        public bool EnablePushNotifications { get; set; } = true;
        public bool EnableEmailAlerts { get; set; } = true;

        // Navigation Properties
        public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();
        public virtual ICollection<Goal> Goals { get; set; } = new List<Goal>();
        public virtual ICollection<IncomeSource> IncomeSources { get; set; } = new List<IncomeSource>();
        public virtual ICollection<Insurance> InsurancePolicies { get; set; } = new List<Insurance>();
        public virtual ICollection<RealEstate> RealEstateProperties { get; set; } = new List<RealEstate>();
        public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();
        public virtual ICollection<UserTask> Tasks { get; set; } = new List<UserTask>();
    }
}