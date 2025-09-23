using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Request model for creating a new task
    /// </summary>
    public class CreateTaskRequest
    {
        public int UserId { get; set; }
        public TaskType Type { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public DateTime? DueDate { get; set; }
        public int? SourceAlertId { get; set; }
        public decimal? EstimatedImpact { get; set; }
        public string? ImpactDescription { get; set; }
        public decimal? ConfidenceScore { get; set; }
    }

    /// <summary>
    /// Request model for completing a task
    /// </summary>
    public class CompleteTaskRequest
    {
        public string? CompletionNotes { get; set; }
    }
}