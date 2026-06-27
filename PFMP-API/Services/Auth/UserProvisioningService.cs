using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models;

namespace PFMP_API.Services.Auth;

public class UserProvisioningService : IUserProvisioningService
{
    private readonly ApplicationDbContext _db;
    private readonly AzureAdOptions _entra;
    private readonly ILogger<UserProvisioningService> _logger;

    public UserProvisioningService(
        ApplicationDbContext db,
        IOptions<AzureAdOptions> entra,
        ILogger<UserProvisioningService> logger)
    {
        _db = db;
        _entra = entra.Value;
        _logger = logger;
    }

    public async Task<UserProvisioningResult> ResolveAsync(ClaimsPrincipal principal, CancellationToken ct = default)
    {
        // Dev path: dev-login mints tokens with a UserId claim. Trust it (the JWT
        // signature already passed the dev scheme validation upstream).
        var devUserId = principal.FindFirst("UserId")?.Value;
        if (!string.IsNullOrWhiteSpace(devUserId) && int.TryParse(devUserId, out var uid))
        {
            var existing = await _db.Users.FirstOrDefaultAsync(u => u.UserId == uid, ct);
            if (existing == null) return new(null, UserProvisioningOutcome.NoSubject, $"Dev user {uid} not found");
            if (!existing.IsActive) return new(null, UserProvisioningOutcome.Inactive, $"Dev user {uid} inactive");
            return new(existing, UserProvisioningOutcome.Existing);
        }

        // Entra path: look up by oid claim.
        var oid = principal.FindFirst("oid")?.Value
                 ?? principal.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value;
        if (string.IsNullOrWhiteSpace(oid))
        {
            return new(null, UserProvisioningOutcome.NoSubject, "Token has no oid or UserId claim");
        }

        var byOid = await _db.Users.FirstOrDefaultAsync(u => u.AzureObjectId == oid, ct);
        if (byOid != null)
        {
            if (!byOid.IsActive) return new(null, UserProvisioningOutcome.Inactive, $"User {byOid.UserId} inactive");
            // Touch last-login + email-sync on every authenticated /me call is too chatty;
            // the caller can do it explicitly when it matters.
            return new(byOid, UserProvisioningOutcome.Existing);
        }

        // First-time login for this Entra identity. Check the admin allowlist BEFORE creating.
        var email = ExtractEmail(principal);
        if (string.IsNullOrWhiteSpace(email))
        {
            return new(null, UserProvisioningOutcome.NoSubject, "Token has no email claim");
        }

        var allowed = _entra.AdminEmails
            .Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
        if (!allowed)
        {
            _logger.LogWarning(
                "Provisioning denied: {Email} (oid {Oid}) is not in AzureAD:AdminEmails allowlist",
                email, oid);
            return new(null, UserProvisioningOutcome.NotAllowed,
                $"Email {email} is not on the admin allowlist");
        }

        // Provision a fresh admin user. No email-based linking — the owner explicitly
        // wanted to start fresh (Wave 25 decision 3=B), so we never reuse an existing
        // PFMP row even if the email collides with a dev seed.
        var givenName = principal.FindFirst(ClaimTypes.GivenName)?.Value
                       ?? principal.FindFirst("given_name")?.Value;
        var surname = principal.FindFirst(ClaimTypes.Surname)?.Value
                      ?? principal.FindFirst("family_name")?.Value;
        var name = principal.FindFirst("name")?.Value;

        var newUser = new User
        {
            Email = email,
            FirstName = givenName ?? ExtractFirstName(name) ?? "Admin",
            LastName = surname ?? ExtractLastName(name) ?? "User",
            AzureObjectId = oid,
            IsActive = true,
            IsTestAccount = false,
            LastLoginAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Users.Add(newUser);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Provisioned new admin user {UserId} ({Email}) from Entra oid {Oid}",
            newUser.UserId, email, oid);

        return new(newUser, UserProvisioningOutcome.Provisioned);
    }

    private static string? ExtractEmail(ClaimsPrincipal principal)
    {
        // preferred_username is the cleanest for B2B guests; falls back to email.
        return principal.FindFirst("preferred_username")?.Value
            ?? principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("email")?.Value
            ?? principal.FindFirst("upn")?.Value;
    }

    private static string? ExtractFirstName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return null;
        var parts = fullName.Trim().Split(' ', 2);
        return parts.Length > 0 ? parts[0] : null;
    }

    private static string? ExtractLastName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return null;
        var parts = fullName.Trim().Split(' ', 2);
        return parts.Length > 1 ? parts[1] : null;
    }
}
