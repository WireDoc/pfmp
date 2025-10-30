using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class OnboardingProgress
{
    public int UserId { get; set; }

    public string? CurrentStepId { get; set; }

    public DateTime UpdatedUtc { get; set; }

    public string? CompletedStepIds { get; set; }

    public string? StepPayloads { get; set; }

    public virtual User User { get; set; } = null!;
}
