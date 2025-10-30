using System;
using System.Collections.Generic;

namespace PFMP_API.Models.Temp;

public partial class Apicredential
{
    public int ApicredentialId { get; set; }

    public int AccountId { get; set; }

    public string ProviderName { get; set; } = null!;

    public string EncryptedApiKey { get; set; } = null!;

    public string? EncryptedApiSecret { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastUsed { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool IsActive { get; set; }

    public virtual Account Account { get; set; } = null!;
}
