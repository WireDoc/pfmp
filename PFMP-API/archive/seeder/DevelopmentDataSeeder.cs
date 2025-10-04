using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Archive.Seeder;

/// <summary>
/// ARCHIVED: Development-only data seeding helper (moved to archive).
/// Retained for historical reference; prefer runtime admin endpoints in UserAdminController now.
/// </summary>
public static class DevelopmentDataSeeder
{
    private record ScenarioUser(string Email, string FirstName, string LastName, string? CurrentStep, IEnumerable<string> CompletedSteps);

    public static async Task SeedDevelopmentData(ApplicationDbContext db)
    {
        await db.Database.MigrateAsync();
        var baselineUser = await SeedBaselineUser(db);
        if (baselineUser != null)
        {
            Services.DevUserRegistry.Register(baselineUser.UserId, baselineUser.Email);
            Services.DevUserRegistry.SetDefault(baselineUser.UserId);
        }
        await SeedOnboardingScenarioUsers(db);
    }

    private static async Task<User?> SeedBaselineUser(ApplicationDbContext db)
    {
        const string email = "dev+baseline@local";
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            user = new User
            {
                FirstName = "Dev",
                LastName = "Baseline",
                Email = email,
                EmergencyFundTarget = 0m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsTestAccount = true,
                BypassAuthentication = true
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        return user;
    }

    private static async Task SeedOnboardingScenarioUsers(ApplicationDbContext db)
    {
        var scenarios = new List<ScenarioUser>
        {
            new("dev+onboarding.fresh@local", "Onboard", "Fresh", null, Array.Empty<string>()),
            new("dev+onboarding.mid@local", "Onboard", "Mid", "financialProfile", new[]{"welcome","profile"}),
            new("dev+onboarding.done@local", "Onboard", "Done", "confirmation", new[]{"welcome","profile","financialProfile","preferences"})
        };

        foreach (var s in scenarios)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == s.Email);
            if (user == null)
            {
                user = new User
                {
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Email = s.Email,
                    EmergencyFundTarget = 0m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsTestAccount = true,
                    BypassAuthentication = true
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
            Services.DevUserRegistry.Register(user.UserId, user.Email);

            var progress = await db.OnboardingProgress.FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (progress == null)
            {
                progress = new OnboardingProgress { UserId = user.UserId };
                db.OnboardingProgress.Add(progress);
            }
            progress.CurrentStepId = s.CurrentStep;
            progress.SetCompletedStepIds(s.CompletedSteps);
            progress.SetStepPayloads(new Dictionary<string, object?>
            {
                ["welcome"] = new { acknowledged = true },
                ["profile"] = new { nickname = "Tester" }
            });
            progress.UpdatedUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }
}
