using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Advice
{
    public int AdviceId { get; set; }

    public int UserId { get; set; }

    public string? Theme { get; set; }

    public string Status { get; set; } = null!;

    public string ConsensusText { get; set; } = null!;

    public int ConfidenceScore { get; set; }

    public string? PrimaryJson { get; set; }

    public string? ValidatorJson { get; set; }

    public string? ViolationsJson { get; set; }

    public int? LinkedTaskId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public DateTime? DismissedAt { get; set; }

    public string? PreviousStatus { get; set; }

    public int? SourceAlertId { get; set; }

    public string? GenerationMethod { get; set; }

    public string? SourceAlertSnapshot { get; set; }

    public decimal? AigenerationCost { get; set; }

    public string? AggressiveRecommendation { get; set; }

    public decimal? AgreementScore { get; set; }

    public string? ConservativeRecommendation { get; set; }

    public bool? HasConsensus { get; set; }

    public int? MarketContextId { get; set; }

    public string? ModelsUsed { get; set; }

    public int? TotalTokensUsed { get; set; }

    public virtual ICollection<AiactionMemory> AiactionMemories { get; set; } = new List<AiactionMemory>();

    public virtual ICollection<Aiconversation> Aiconversations { get; set; } = new List<Aiconversation>();

    public virtual ICollection<AiuserMemory> AiuserMemories { get; set; } = new List<AiuserMemory>();

    public virtual MarketContext? MarketContext { get; set; }

    public virtual User User { get; set; } = null!;
}
