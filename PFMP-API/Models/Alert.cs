using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Models
{
    public enum AlertSeverity
    {
        Low = 1,
        Medium = 2,
        High = 3,
        Critical = 4
    }

    public enum AlertCategory
    {
        Portfolio = 1,
        Goal = 2,
        Transaction = 3,
        Performance = 4,
        Security = 5,
        Tax = 6,
        Rebalancing = 7
    }

    public class Alert
    {
        public int AlertId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        public AlertSeverity Severity { get; set; } = AlertSeverity.Medium;
        public AlertCategory Category { get; set; } = AlertCategory.Portfolio;

        public bool IsRead { get; set; } = false;
        public bool IsDismissed { get; set; } = false;
        public bool IsActionable { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
        public DateTime? DismissedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        public string? ActionUrl { get; set; } // URL for actionable alerts
        public string? Metadata { get; set; } // JSON for additional context
        
        // Task generation for actionable alerts
        public int? GeneratedTaskId { get; set; } // Links to auto-generated task
        public bool TaskGenerated { get; set; } = false; // Track if task was created

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual UserTask? GeneratedTask { get; set; }
    }
}