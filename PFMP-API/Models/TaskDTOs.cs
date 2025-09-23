using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Models
{
    /// <summary>
    /// DTO for creating new tasks
    /// </summary>
    public class CreateTaskRequest
    {
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

        public DateTime? DueDate { get; set; }

        public int? SourceAlertId { get; set; }

        public decimal? EstimatedImpact { get; set; }

        public string? ImpactDescription { get; set; }

        public decimal? ConfidenceScore { get; set; }
    }

    /// <summary>
    /// DTO for updating tasks
    /// </summary>
    public class UpdateTaskRequest
    {
        [MaxLength(200)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public TaskPriority? Priority { get; set; }

        public TaskStatus? Status { get; set; }

        public DateTime? DueDate { get; set; }

        public string? Notes { get; set; }

        [Range(0, 100)]
        public int? ProgressPercentage { get; set; }
    }

    /// <summary>
    /// DTO for completing tasks
    /// </summary>
    public class CompleteTaskRequest
    {
        public string? CompletionNotes { get; set; }
    }
}