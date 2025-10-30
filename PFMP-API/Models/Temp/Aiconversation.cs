using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Aiconversation
{
    public int ConversationId { get; set; }

    public int UserId { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public string ConversationType { get; set; } = null!;

    public string? ConversationSummary { get; set; }

    public int TotalTokensUsed { get; set; }

    public decimal TotalCost { get; set; }

    public int MessageCount { get; set; }

    public bool GeneratedAdvice { get; set; }

    public int? RelatedAdviceId { get; set; }

    public virtual ICollection<Aimessage> Aimessages { get; set; } = new List<Aimessage>();

    public virtual ICollection<AiuserMemory> AiuserMemories { get; set; } = new List<AiuserMemory>();

    public virtual Advice? RelatedAdvice { get; set; }

    public virtual User User { get; set; } = null!;
}
