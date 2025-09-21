using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Models
{
    public enum MilestoneStatus
    {
        NotStarted = 0,
        InProgress = 1,
        Completed = 2,
        Delayed = 3,
        Cancelled = 4
    }

    public class GoalMilestone
    {
        public int MilestoneId { get; set; }

        [Required]
        public int GoalId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal TargetAmount { get; set; }

        public decimal CurrentAmount { get; set; } = 0;

        [Required]
        public DateTime TargetDate { get; set; }

        public MilestoneStatus Status { get; set; } = MilestoneStatus.NotStarted;

        public int SortOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        // Navigation properties
        public virtual Goal Goal { get; set; } = null!;
    }
}