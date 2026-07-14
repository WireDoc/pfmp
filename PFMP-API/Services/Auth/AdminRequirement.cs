using Microsoft.AspNetCore.Authorization;

namespace PFMP_API.Services.Auth;

/// <summary>
/// Wave 26 — "AdminOnly" policy requirement. The DB (Users.IsAdmin) is the
/// single source of truth: no role claims to keep consistent across the two
/// token schemes, and promote/demote applies on the next request rather than
/// the next token refresh.
/// </summary>
public class AdminRequirement : IAuthorizationRequirement { }

public class AdminRequirementHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly ICurrentUserContext _current;

    public AdminRequirementHandler(ICurrentUserContext current)
    {
        _current = current;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        var user = await _current.GetCurrentUserAsync();
        if (user?.IsAdmin == true)
        {
            context.Succeed(requirement);
        }
    }
}
