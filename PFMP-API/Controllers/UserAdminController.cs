using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using Microsoft.AspNetCore.Authorization;

namespace PFMP_API.Controllers;

/// <summary>
/// Administrative / development user management endpoints to create and delete users (and related cascaded data).
/// Restricted to Development or Testing environments (simple gate for now).
/// Wave 26: gated behind the AdminOnly policy — any authenticated user could
/// previously create/delete users through this controller.
/// </summary>
[ApiController]
[Route("api/admin/users")] // explicit admin tooling route
[Authorize(Policy = "AdminOnly")]
public class UserAdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly PFMP_API.Services.Auth.ICurrentUserContext _currentUser;

    public UserAdminController(ApplicationDbContext db, IWebHostEnvironment env, PFMP_API.Services.Auth.ICurrentUserContext currentUser)
    {
        _db = db;
        _env = env;
        _currentUser = currentUser;
    }

    private bool IsAllowedEnv() => _env.IsDevelopment() || _env.IsEnvironment("Testing");

    /// <summary>
    /// List users. Wave 26: no longer environment-gated — the AdminOnly policy
    /// is the gate, and the admin users page needs this in every environment.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> ListUsers(CancellationToken ct = default)
    {
        var users = await _db.Users
            .OrderBy(u => u.UserId)
            .Select(u => new UserDto(u.UserId, u.FirstName, u.LastName, u.Email, u.CreatedAt, u.IsTestAccount, u.BypassAuthentication, u.IsActive, u.IsAdmin, u.LastLoginAt))
            .ToListAsync(ct);
        return Ok(users);
    }

    /// <summary>
    /// Wave 26 — activate/deactivate a user. Deactivated users fail token
    /// resolution (provisioning checks IsActive) so lockout is immediate.
    /// Self-deactivation is refused to avoid locking out the last admin.
    /// </summary>
    [HttpPatch("{userId:int}/active")]
    public async Task<ActionResult<UserDto>> SetActive(int userId, [FromBody] SetActiveRequest request, CancellationToken ct = default)
    {
        var current = await _currentUser.GetCurrentUserAsync(ct);
        if (current != null && current.UserId == userId && !request.IsActive)
        {
            return BadRequest(new { message = "You cannot deactivate your own account." });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
        if (user == null) return NotFound();

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new UserDto(user.UserId, user.FirstName, user.LastName, user.Email, user.CreatedAt, user.IsTestAccount, user.BypassAuthentication, user.IsActive, user.IsAdmin, user.LastLoginAt));
    }

    public record SetActiveRequest(bool IsActive);

    /// <summary>
    /// Delete a user and all cascaded related data. 204 if deleted, 404 if not found.
    /// </summary>
    [HttpDelete("{userId:int}")]
    public async Task<IActionResult> DeleteUser(int userId, CancellationToken ct = default)
    {
        if (!IsAllowedEnv()) return NotFound();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
        if (user == null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    public record CreateUserRequest(string FirstName, string LastName, string Email, decimal EmergencyFundTarget = 0m, bool? BypassAuth = null);
    public record UserDto(int UserId, string FirstName, string LastName, string Email, DateTime CreatedAt, bool IsTestAccount, bool BypassAuthentication, bool IsActive = true, bool IsAdmin = false, DateTime? LastLoginAt = null);

    /// <summary>
    /// Create a normal (non-test) user with minimal required fields.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserRequest request, CancellationToken ct = default)
    {
        if (!IsAllowedEnv()) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest("Email required");
        if (await _db.Users.AnyAsync(u => u.Email == request.Email, ct)) return Conflict("Email already exists");
        var now = DateTime.UtcNow;
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            EmergencyFundTarget = request.EmergencyFundTarget,
            CreatedAt = now,
            UpdatedAt = now,
            IsTestAccount = false,
            BypassAuthentication = request.BypassAuth ?? false
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        var dto = new UserDto(user.UserId, user.FirstName, user.LastName, user.Email, user.CreatedAt, user.IsTestAccount, user.BypassAuthentication);
        return Created($"/api/admin/users/{user.UserId}", dto);
    }

    /// <summary>
    /// Create a test user; optional onboarding scenario seeding: fresh|mid|done (default fresh).
    /// </summary>
    [HttpPost("test")]
    public async Task<ActionResult<UserDto>> CreateTestUser([FromQuery] string? scenario = null, [FromQuery] string? emailPrefix = null, CancellationToken ct = default)
    {
        if (!IsAllowedEnv()) return NotFound();
        var sc = (scenario ?? "fresh").ToLowerInvariant();
        if (sc is not ("fresh" or "mid" or "done")) return BadRequest("Invalid scenario. Use fresh|mid|done.");
        var prefix = string.IsNullOrWhiteSpace(emailPrefix) ? "dev" : emailPrefix!.Trim();
        var email = $"{prefix}+{sc}+{Guid.NewGuid():N}@local";
        var now = DateTime.UtcNow;
        var user = new User
        {
            FirstName = "Test",
            LastName = sc[..1].ToUpper() + sc[1..],
            Email = email,
            EmergencyFundTarget = 0m,
            CreatedAt = now,
            UpdatedAt = now,
            IsTestAccount = true,
            BypassAuthentication = true
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        // Seed onboarding snapshot for mid/done directly (local logic instead of global seeder)
        if (sc != "fresh")
        {
            var progress = new OnboardingProgress
            {
                UserId = user.UserId,
                CurrentStepId = sc == "mid" ? "financialProfile" : "confirmation"
            };
            if (sc == "mid")
            {
                progress.SetCompletedStepIds(new[] { "welcome", "profile" });
            }
            else if (sc == "done")
            {
                progress.SetCompletedStepIds(new[] { "welcome", "profile", "financialProfile", "preferences" });
            }
            progress.SetStepPayloads(new Dictionary<string, object?>
            {
                ["welcome"] = new { acknowledged = true },
                ["profile"] = new { nickname = "Tester" }
            });
            progress.UpdatedUtc = DateTime.UtcNow;
            _db.OnboardingProgress.Add(progress);
            await _db.SaveChangesAsync(ct);
        }

        var dto = new UserDto(user.UserId, user.FirstName, user.LastName, user.Email, user.CreatedAt, user.IsTestAccount, user.BypassAuthentication);
        return Created($"/api/admin/users/{user.UserId}", dto);
    }

    /// <summary>
    /// Reset (delete) onboarding progress for a user without deleting the user.
    /// </summary>
    [HttpPost("{userId:int}/onboarding/reset")]
    public async Task<IActionResult> ResetOnboarding(int userId, CancellationToken ct = default)
    {
        if (!IsAllowedEnv()) return NotFound();
        var progress = await _db.OnboardingProgress.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (progress != null)
        {
            _db.OnboardingProgress.Remove(progress);
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }
}
