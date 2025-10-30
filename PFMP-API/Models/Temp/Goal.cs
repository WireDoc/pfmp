using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Goal
{
    public int GoalId { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public int Type { get; set; }

    public int Category { get; set; }

    public decimal TargetAmount { get; set; }

    public decimal CurrentAmount { get; set; }

    public DateTime? TargetDate { get; set; }

    public decimal? MonthlyContribution { get; set; }

    public decimal? RequiredMonthlyContribution { get; set; }

    public decimal? TargetMonthlyIncome { get; set; }

    public decimal? ExpectedAnnualReturn { get; set; }

    public decimal? WithdrawalRate { get; set; }

    public int? RetirementAgeTarget { get; set; }

    public int? MonthsOfExpenses { get; set; }

    public decimal? MonthlyExpenses { get; set; }

    public int RiskTolerance { get; set; }

    public int Strategy { get; set; }

    public int Priority { get; set; }

    public int Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? Notes { get; set; }

    public virtual ICollection<GoalMilestone> GoalMilestones { get; set; } = new List<GoalMilestone>();

    public virtual User User { get; set; } = null!;
}
