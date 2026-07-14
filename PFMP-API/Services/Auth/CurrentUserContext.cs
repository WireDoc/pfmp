using PFMP_API.Models;

namespace PFMP_API.Services.Auth;

/// <summary>
/// Wave 26 — resolves the caller's <see cref="User"/> row from the request's
/// ClaimsPrincipal exactly once per request (scoped lifetime caches the
/// result), so the ownership filter and the AdminOnly policy don't each pay
/// for a provisioning lookup.
/// </summary>
public interface ICurrentUserContext
{
    /// <summary>The resolved user, or null when the request is anonymous or
    /// the token doesn't map to an active PFMP user.</summary>
    Task<User?> GetCurrentUserAsync(CancellationToken ct = default);
}

public class CurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _http;
    private readonly IUserProvisioningService _provisioning;
    private User? _cached;
    private bool _resolved;

    public CurrentUserContext(IHttpContextAccessor http, IUserProvisioningService provisioning)
    {
        _http = http;
        _provisioning = provisioning;
    }

    public async Task<User?> GetCurrentUserAsync(CancellationToken ct = default)
    {
        if (_resolved) return _cached;

        var principal = _http.HttpContext?.User;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            _resolved = true;
            return null;
        }

        var result = await _provisioning.ResolveAsync(principal, ct);
        _cached = result.Outcome is UserProvisioningOutcome.Existing or UserProvisioningOutcome.Provisioned
            ? result.User
            : null;
        _resolved = true;
        return _cached;
    }
}
