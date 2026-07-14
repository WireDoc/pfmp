using System.Collections;
using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PFMP_API.Services.Auth;

namespace PFMP_API.Filters;

/// <summary>
/// Wave 26 — global token↔userId cross-check (locked decision 2C).
///
/// Endpoints across ~30 controllers accept a caller-supplied userId (query,
/// route, or a UserId property on a bound body model) and historically trusted
/// it. This filter compares every bound userId against the authenticated
/// caller and rejects mismatches with 403. Admins are exempt — that exemption
/// is what powers the admin-only "switch to dev users" impersonation.
///
/// Known limits (accepted in the wave doc): entity-id-keyed endpoints carry no
/// userId to check, and unbound defaults like "userId ?? 1" are invisible
/// here. Both belong to the opportunistic claims refactor.
/// </summary>
public class UserOwnershipFilter : IAsyncActionFilter
{
    private static readonly ConcurrentDictionary<Type, PropertyInfo?> UserIdPropertyCache = new();

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Anonymous endpoints (health, dev-login, docs) — nothing to check.
        // [Authorize] rejection happens in the auth middleware before this runs.
        if (context.HttpContext.User?.Identity?.IsAuthenticated != true)
        {
            await next();
            return;
        }

        var currentUserContext = context.HttpContext.RequestServices.GetRequiredService<ICurrentUserContext>();
        var currentUser = await currentUserContext.GetCurrentUserAsync(context.HttpContext.RequestAborted);

        if (currentUser == null)
        {
            // Valid signature but no active PFMP user behind it (e.g. Entra
            // token whose email isn't allowlisted). Same outcome as /auth/me.
            context.Result = new ObjectResult(new { message = "Token does not resolve to an active user." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        if (currentUser.IsAdmin)
        {
            await next();
            return;
        }

        foreach (var claimedUserId in EnumerateClaimedUserIds(context.ActionArguments))
        {
            // 0 = an unset default on an optional body field, never a real user.
            if (claimedUserId == 0) continue;

            if (claimedUserId != currentUser.UserId)
            {
                context.Result = new ObjectResult(new
                {
                    message = $"userId {claimedUserId} does not belong to the authenticated user."
                })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }
        }

        await next();
    }

    private static IEnumerable<int> EnumerateClaimedUserIds(IDictionary<string, object?> actionArguments)
    {
        foreach (var (name, value) in actionArguments)
        {
            if (value == null) continue;

            // [FromQuery]/[FromRoute] int userId (or int?)
            if (name.Equals("userId", StringComparison.OrdinalIgnoreCase))
            {
                if (value is int direct) yield return direct;
                continue;
            }

            // Bound body models carrying a UserId property, including
            // collection payloads of such models.
            if (value is string || value.GetType().IsPrimitive) continue;

            if (value is IEnumerable enumerable and not IDictionary)
            {
                foreach (var item in enumerable)
                {
                    if (item != null && TryGetUserId(item, out var fromItem)) yield return fromItem;
                }
                continue;
            }

            if (TryGetUserId(value, out var fromModel)) yield return fromModel;
        }
    }

    private static bool TryGetUserId(object model, out int userId)
    {
        userId = 0;
        var type = model.GetType();
        if (type.IsPrimitive || type == typeof(string) || type.IsEnum) return false;

        var prop = UserIdPropertyCache.GetOrAdd(type, static t =>
        {
            var p = t.GetProperty("UserId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            return p != null && (p.PropertyType == typeof(int) || p.PropertyType == typeof(int?)) ? p : null;
        });

        if (prop == null) return false;

        var raw = prop.GetValue(model);
        if (raw is int id)
        {
            userId = id;
            return true;
        }
        return false;
    }
}
