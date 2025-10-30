using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class GoalMilestone
{
    public int MilestoneId { get; set; }

    public int GoalId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public decimal TargetAmount { get; set; }

    public decimal CurrentAmount { get; set; }

    public DateTime TargetDate { get; set; }

    public int Status { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public virtual Goal Goal { get; set; } = null!;
}
