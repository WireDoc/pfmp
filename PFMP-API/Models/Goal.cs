using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    /// <summary>
    /// Financial goals including retirement, emergency fund, and custom goals
    /// </summary>
    public class Goal
    {
        [Key]
        public int GoalId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public GoalType Type { get; set; }

        [Required]
        public GoalCategory Category { get; set; }

        // Target Information
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal TargetAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentAmount { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal RemainingAmount => TargetAmount - CurrentAmount;

        [Column(TypeName = "decimal(8,4)")]
        public decimal CompletionPercentage => 
            TargetAmount != 0 ? (CurrentAmount / TargetAmount) * 100 : 0;

        public DateTime? TargetDate { get; set; }

        // Monthly Planning
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyContribution { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RequiredMonthlyContribution { get; set; }

        // Retirement Specific Fields
        [Column(TypeName = "decimal(18,2)")]
        public decimal? TargetMonthlyIncome { get; set; } // For passive income goals

        [Column(TypeName = "decimal(8,4)")]
        public decimal? ExpectedAnnualReturn { get; set; } // Expected portfolio return

        [Column(TypeName = "decimal(8,4)")]
        public decimal? WithdrawalRate { get; set; } // 4% rule, etc.

        public int? RetirementAgeTarget { get; set; }

        // Emergency Fund Specific
        public int? MonthsOfExpenses { get; set; } // Alternative to fixed amount

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyExpenses { get; set; }

        // Risk and Strategy
        public int RiskTolerance { get; set; } = 5; // 1-10 scale
        public GoalStrategy Strategy { get; set; } = GoalStrategy.Balanced;

        // Priority and Status
        public int Priority { get; set; } = 3; // 1-5 scale, 5 = highest
        public GoalStatus Status { get; set; } = GoalStatus.Active;

        // Milestone Tracking
        public virtual ICollection<GoalMilestone> Milestones { get; set; } = new List<GoalMilestone>();

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("UserId")]
        [JsonIgnore] // Prevent circular reference in JSON serialization
        public virtual User User { get; set; } = null!;
    }

    public enum GoalType
    {
        EmergencyFund,
        Retirement,
        Education,
        HouseDownPayment,
        VacationTravel,
        DebtPayoff,
        CarPurchase,
        HomeImprovement,
        Investment,
        Business,
        Custom
    }

    public enum GoalCategory
    {
        ShortTerm, // < 2 years
        MediumTerm, // 2-10 years
        LongTerm, // > 10 years
        Ongoing // No specific end date
    }

    public enum GoalStrategy
    {
        Conservative, // Low risk, steady growth
        Balanced, // Moderate risk/return
        Growth, // Higher risk for growth
        Aggressive, // High risk/high reward
        Income // Focus on dividends/income
    }

    public enum GoalStatus
    {
        Planning,
        Active,
        OnTrack,
        BehindTarget,
        AheadOfTarget,
        Paused,
        Completed,
        Cancelled
    }
}