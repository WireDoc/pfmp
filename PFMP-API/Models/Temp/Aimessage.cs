using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Aimessage
{
    public int MessageId { get; set; }

    public int ConversationId { get; set; }

    public string Role { get; set; } = null!;

    public string Content { get; set; } = null!;

    public DateTime SentAt { get; set; }

    public string? ModelUsed { get; set; }

    public int? TokensUsed { get; set; }

    public decimal? MessageCost { get; set; }

    public bool UsedConsensus { get; set; }

    public decimal? AgreementScore { get; set; }

    public virtual Aiconversation Conversation { get; set; } = null!;
}
