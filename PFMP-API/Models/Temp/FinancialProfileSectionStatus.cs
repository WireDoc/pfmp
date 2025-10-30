using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class FinancialProfileSectionStatus
{
    public Guid SectionStatusId { get; set; }

    public int UserId { get; set; }

    public string SectionKey { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? OptOutReason { get; set; }

    public DateTime? OptOutAcknowledgedAt { get; set; }

    public string? DataChecksum { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
