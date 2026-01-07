using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    public enum TaskType
    {
        Rebalancing = 1,
        StockPurchase = 2,
        TaxLossHarvesting = 3,
        CashOptimization = 4,
        GoalAdjustment = 5,
        InsuranceReview = 6,
        EmergencyFundContribution = 7,
        TSPAllocationChange = 8,
        PropertyValueUpdate = 9
    }

    public enum TaskStatus
    {
        Pending = 1,
        Accepted = 2,
        InProgress = 3,
        Completed = 4,
        Dismissed = 5
    }

    public enum TaskPriority
    {
        Low = 1,
        Medium = 2,
        High = 3,
        Critical = 4
    }

    /// <summary>
    /// Represents actionable tasks generated from AI recommendations
    /// </summary>
    public class UserTask
    {
        [Key]
        public int TaskId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public TaskType Type { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public TaskPriority Priority { get; set; } = TaskPriority.Medium;

        public TaskStatus Status { get; set; } = TaskStatus.Pending;

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? DueDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public DateTime? DismissedDate { get; set; }

        // Link to the source recommendation/alert that generated this task
        public int? SourceAlertId { get; set; }
    /// <summary>
    /// Optional link directly to originating advice (supersedes SourceAlertId for direct provenance).
    /// </summary>
    public int? SourceAdviceId { get; set; }

    /// <summary>
    /// Source type descriptor (e.g., 'Advice', 'Manual').
    /// </summary>
    [MaxLength(30)]
    public string? SourceType { get; set; }

        // Additional context and metadata
        public string? Notes { get; set; }
        public string? CompletionNotes { get; set; }

        // Estimated financial impact
        [Column(TypeName = "decimal(18,2)")]
        public decimal? EstimatedImpact { get; set; }

        public string? ImpactDescription { get; set; }

        // Progress tracking
        public int ProgressPercentage { get; set; } = 0; // 0-100

        // AI confidence score for this recommendation
        [Column(TypeName = "decimal(5,2)")]
        public decimal? ConfidenceScore { get; set; } // 0.00-1.00

        // Navigation Properties
        [JsonIgnore]
        public virtual User? User { get; set; }
        [JsonIgnore]
        public virtual Alert? SourceAlert { get; set; }
    }
}