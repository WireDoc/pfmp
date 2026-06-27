namespace PFMP_API.Services.Auth;

/// <summary>
/// Wave 25 — strongly-typed Microsoft Entra ID config bound from <c>AzureAD:*</c>.
/// The frontend SPA uses MSAL with the same Tenant/Client IDs; the API validates
/// JWT bearer tokens against this tenant authority and matches <see cref="Audience"/>.
/// </summary>
public class AzureAdOptions
{
    public const string SectionName = "AzureAD";

    /// <summary>Azure tenant GUID. Used to build the authority URL.</summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>App Registration's Application (client) ID.</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Expected JWT audience — typically <c>api://{ClientId}</c> for v2 tokens
    /// issued for the API scope exposed by the App Registration.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Allowlist of email addresses (matched against the token's
    /// <c>preferred_username</c> or <c>email</c> claim, case-insensitive) that
    /// are auto-provisioned as admins on first login. Anyone else with a valid
    /// Entra token gets rejected during provisioning — single-user enforcement
    /// for Phase 5 v1, easily extended to a pending-approval flow later.
    /// </summary>
    public List<string> AdminEmails { get; set; } = new();

    /// <summary>True iff TenantId + ClientId are both populated with non-placeholder values.</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(TenantId)
        && !string.IsNullOrWhiteSpace(ClientId)
        && !TenantId.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
        && !ClientId.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase);

    /// <summary>Convenience: full v2.0 authority URL (Entra tenant endpoint).</summary>
    public string AuthorityV2 => $"https://login.microsoftonline.com/{TenantId}/v2.0";

    /// <summary>The JWT bearer authentication scheme name used for Entra-issued tokens.</summary>
    public const string Scheme = "EntraJwt";
}
