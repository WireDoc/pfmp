using System.Security.Claims;
using PFMP_API.Models;

namespace PFMP_API.Services.Auth;

/// <summary>
/// Wave 25 — resolves the current <see cref="User"/> from an authenticated
/// <see cref="ClaimsPrincipal"/>. Handles both schemes:
///   - Dev JWTs minted by <c>/api/auth/dev-login</c> carry a <c>UserId</c> claim;
///     looked up directly in the <c>Users</c> table.
///   - Entra-issued JWTs carry an <c>oid</c> claim; looked up by <c>AzureObjectId</c>.
///     If not found, a new admin user is created if the token's email matches the
///     <c>AzureAD:AdminEmails</c> allowlist — otherwise null (caller returns 403).
/// </summary>
public interface IUserProvisioningService
{
    Task<UserProvisioningResult> ResolveAsync(ClaimsPrincipal principal, CancellationToken ct = default);
}

public record UserProvisioningResult(
    User? User,
    UserProvisioningOutcome Outcome,
    string? Reason = null);

public enum UserProvisioningOutcome
{
    /// <summary>Resolved an existing user (dev or Entra path).</summary>
    Existing,
    /// <summary>Provisioned a new admin user from an Entra token (first login).</summary>
    Provisioned,
    /// <summary>Token had no usable subject claim (oid or UserId).</summary>
    NoSubject,
    /// <summary>Looked up successfully but the row is marked <c>!IsActive</c>.</summary>
    Inactive,
    /// <summary>Entra token but email not in the AdminEmails allowlist.</summary>
    NotAllowed
}
