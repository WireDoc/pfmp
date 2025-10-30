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

        [Column(TypeName = "decimal(5,2)")]
        public decimal? LiquidityBufferMonths { get; set; }

        // Government Employment
        public bool IsGovernmentEmployee { get; set; } = true;
        public string? GovernmentAgency { get; set; }

    // Household & profile identity
    public string? PreferredName { get; set; }
    public string? MaritalStatus { get; set; }
    public int? DependentCount { get; set; }
    public string? HouseholdServiceNotes { get; set; }

        // VA Benefits
        public int? VADisabilityPercentage { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal? VADisabilityMonthlyAmount { get; set; }

        // Profile & Demographics (NEW FIELDS)
        public DateTime? DateOfBirth { get; set; }
        public string? EmploymentType { get; set; } // Federal, Military, Contractor, Private
        public DateTime? ServiceComputationDate { get; set; } // OPM SCD for retirement eligibility
        public string? PayGrade { get; set; } // GS-12, O-4, E-6, etc.
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AnnualIncome { get; set; }
        public string? RetirementSystem { get; set; } // FERS, CSRS, Military

        // Setup Workflow Status
        public bool ProfileSetupComplete { get; set; } = false;
        public DateTime? ProfileCompletedAt { get; set; }
        public string? SetupStepsCompleted { get; set; } // JSON array of completed steps
        public int SetupProgressPercentage { get; set; } = 0;

        // Authentication & Security
        public string? PasswordHash { get; set; } // BCrypt hashed password for local authentication
        public string? AzureObjectId { get; set; } // Azure EntraID Object ID for SSO
        public bool IsActive { get; set; } = true; // Account status
        public DateTime? LastLoginAt { get; set; }
        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? AccountLockedUntil { get; set; }

        // Development/Testing Features
        public bool IsTestAccount { get; set; } = false; // Flag for development accounts
        public bool BypassAuthentication { get; set; } = false; // Allow dev access without auth

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