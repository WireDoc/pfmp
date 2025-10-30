using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class AiuserMemory
{
    public int UserMemoryId { get; set; }

    public int UserId { get; set; }

    public string MemoryType { get; set; } = null!;

    public string MemoryKey { get; set; } = null!;

    public string MemoryValue { get; set; } = null!;

    public string? Context { get; set; }

    public int ConfidenceScore { get; set; }

    public DateTime LearnedAt { get; set; }

    public DateTime LastReinforcedAt { get; set; }

    public int ReinforcementCount { get; set; }

    public bool IsActive { get; set; }

    public DateTime? DeprecatedAt { get; set; }

    public string? DeprecationReason { get; set; }

    public int? SourceConversationId { get; set; }

    public int? SourceAdviceId { get; set; }

    public virtual Advice? SourceAdvice { get; set; }

    public virtual Aiconversation? SourceConversation { get; set; }

    public virtual User User { get; set; } = null!;
}
