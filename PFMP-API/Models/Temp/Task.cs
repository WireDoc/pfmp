using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Task
{
    public int TaskId { get; set; }

    public int UserId { get; set; }

    public int Type { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public int Priority { get; set; }

    public int Status { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? DueDate { get; set; }

    public DateTime? CompletedDate { get; set; }

    public DateTime? DismissedDate { get; set; }

    public int? SourceAlertId { get; set; }

    public string? Notes { get; set; }

    public string? CompletionNotes { get; set; }

    public decimal? EstimatedImpact { get; set; }

    public string? ImpactDescription { get; set; }

    public int ProgressPercentage { get; set; }

    public decimal? ConfidenceScore { get; set; }

    public int? SourceAdviceId { get; set; }

    public string? SourceType { get; set; }

    public virtual Alert? SourceAlert { get; set; }

    public virtual User User { get; set; } = null!;
}
