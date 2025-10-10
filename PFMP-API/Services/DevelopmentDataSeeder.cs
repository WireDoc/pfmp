using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Models;
using PFMP_API.Services.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Development-only data seeding helper.
/// Invoked from Program.cs when Development:SeedTestData = true.
/// Provides: baseline user (id=1), onboarding scenario users, future portfolio variants.
/// Idempotent: uses deterministic emails to avoid duplication.
/// </summary>
public static class DevelopmentDataSeeder
{
    private record ScenarioUser(string Email, string FirstName, string LastName, string? CurrentStep, IEnumerable<string> CompletedSteps);

    public static async Task SeedDevelopmentData(ApplicationDbContext db)
    {
        // Ensure database exists/migrated
        await db.Database.MigrateAsync();

        var baselineUser = await SeedBaselineUser(db);
        if (baselineUser != null)
        {
            DevUserRegistry.Register(baselineUser.UserId, baselineUser.Email);
            DevUserRegistry.SetDefault(baselineUser.UserId);
            await SeedFinancialProfileSampleAsync(db, baselineUser.UserId);
        }
        await SeedOnboardingScenarioUsers(db);
        // Portfolio variants placeholder for future expansion
    }

    private static async Task<User?> SeedBaselineUser(ApplicationDbContext db)
    {
        // Baseline dev user (id guaranteed by identity if first row). We search by email.
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
            DevUserRegistry.Register(user.UserId, user.Email);

            // Seed onboarding progress if not present or needs refresh for deterministic baseline
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
                // Minimal example payloads (can expand per step rules later)
                ["welcome"] = new { acknowledged = true },
                ["profile"] = new { nickname = "Tester" }
            });
            progress.UpdatedUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await SeedFinancialProfileSampleAsync(db, user.UserId);
        }
    }

    private static async Task SeedFinancialProfileSampleAsync(ApplicationDbContext db, int userId)
    {
        if (await db.FinancialProfileSectionStatuses.AnyAsync(s => s.UserId == userId))
        {
            return;
        }

        var profileService = new FinancialProfileService(db, NullLogger<FinancialProfileService>.Instance);

        await profileService.UpsertHouseholdAsync(userId, new HouseholdProfileInput
        {
            PreferredName = "Dev Household",
            MaritalStatus = "Married",
            DependentCount = 2,
            ServiceNotes = "Seeded sample household profile"
        });

        await profileService.UpsertRiskGoalsAsync(userId, new RiskGoalsInput
        {
            RiskTolerance = 6,
            TargetRetirementDate = DateTime.UtcNow.AddYears(15),
            PassiveIncomeGoal = 4500m,
            EmergencyFundTarget = 25000m
        });

        await profileService.UpsertTspAsync(userId, new TspAllocationInput
        {
            ContributionRatePercent = 12.5m,
            EmployerMatchPercent = 5m,
            CurrentBalance = 185000m,
            TargetBalance = 750000m,
            GFundPercent = 5m,
            FFundPercent = 10m,
            CFundPercent = 45m,
            SFundPercent = 20m,
            IFundPercent = 10m,
            LifecyclePercent = 10m,
            LifecycleBalance = 18500m
        });

        await profileService.UpsertCashAccountsAsync(userId, new CashAccountsInput
        {
            Accounts = new List<CashAccountInput>
            {
                new CashAccountInput
                {
                    Nickname = "Emergency Fund",
                    AccountType = "high-yield",
                    Institution = "Ally Bank",
                    Balance = 18000m,
                    InterestRateApr = 4.25m,
                    IsEmergencyFund = true,
                    RateLastChecked = DateTime.UtcNow.AddDays(-14)
                },
                new CashAccountInput
                {
                    Nickname = "Checking",
                    AccountType = "checking",
                    Institution = "Navy Federal",
                    Balance = 5200m,
                    InterestRateApr = 0.10m,
                    IsEmergencyFund = false,
                    RateLastChecked = DateTime.UtcNow.AddMonths(-1)
                }
            }
        });

        await profileService.UpsertInvestmentAccountsAsync(userId, new InvestmentAccountsInput
        {
            Accounts = new List<InvestmentAccountInput>
            {
                new InvestmentAccountInput
                {
                    AccountName = "Brokerage - Vanguard",
                    AccountCategory = "brokerage",
                    Institution = "Vanguard",
                    AssetClass = "index-fund",
                    CurrentValue = 95000m,
                    CostBasis = 72500m,
                    ContributionRatePercent = 6m,
                    IsTaxAdvantaged = false,
                    LastContributionDate = DateTime.UtcNow.AddDays(-12)
                },
                new InvestmentAccountInput
                {
                    AccountName = "Roth IRA - Fidelity",
                    AccountCategory = "ira",
                    Institution = "Fidelity",
                    AssetClass = "target-date",
                    CurrentValue = 68000m,
                    CostBasis = 54000m,
                    ContributionRatePercent = 5m,
                    IsTaxAdvantaged = true,
                    LastContributionDate = DateTime.UtcNow.AddDays(-25)
                }
            }
        });

        await profileService.UpsertPropertiesAsync(userId, new PropertiesInput
        {
            Properties = new List<PropertyInput>
            {
                new PropertyInput
                {
                    PropertyName = "Primary Residence",
                    PropertyType = "residential",
                    Occupancy = "owner",
                    EstimatedValue = 525000m,
                    MortgageBalance = 312000m,
                    MonthlyMortgagePayment = 2450m,
                    MonthlyRentalIncome = 0m,
                    MonthlyExpenses = 350m,
                    HasHeloc = false
                },
                new PropertyInput
                {
                    PropertyName = "Rental Duplex",
                    PropertyType = "residential",
                    Occupancy = "rental",
                    EstimatedValue = 410000m,
                    MortgageBalance = 265000m,
                    MonthlyMortgagePayment = 1980m,
                    MonthlyRentalIncome = 3200m,
                    MonthlyExpenses = 600m,
                    HasHeloc = true
                }
            }
        });

        await profileService.UpsertInsurancePoliciesAsync(userId, new InsurancePoliciesInput
        {
            Policies = new List<InsurancePolicyInput>
            {
                new InsurancePolicyInput
                {
                    PolicyType = "life",
                    Carrier = "USAA",
                    PolicyName = "Term Life 30yr",
                    CoverageAmount = 750000m,
                    PremiumAmount = 68.50m,
                    PremiumFrequency = "monthly",
                    RenewalDate = DateTime.UtcNow.AddMonths(6),
                    IsAdequateCoverage = true,
                    RecommendedCoverage = 750000m
                },
                new InsurancePolicyInput
                {
                    PolicyType = "disability",
                    Carrier = "Guardian",
                    PolicyName = "Own Occupation",
                    CoverageAmount = 5000m,
                    PremiumAmount = 120.00m,
                    PremiumFrequency = "monthly",
                    RenewalDate = DateTime.UtcNow.AddMonths(10),
                    IsAdequateCoverage = true,
                    RecommendedCoverage = 5000m
                }
            }
        });

        await profileService.UpsertIncomeStreamsAsync(userId, new IncomeStreamsInput
        {
            Streams = new List<IncomeStreamInput>
            {
                new IncomeStreamInput
                {
                    Name = "GS Salary",
                    IncomeType = "salary",
                    MonthlyAmount = 8500m,
                    AnnualAmount = 102000m,
                    IsGuaranteed = true,
                    StartDate = DateTime.UtcNow.AddYears(-5),
                    IsActive = true
                },
                new IncomeStreamInput
                {
                    Name = "Rental Income",
                    IncomeType = "rental",
                    MonthlyAmount = 3200m,
                    AnnualAmount = 38400m,
                    IsGuaranteed = false,
                    StartDate = DateTime.UtcNow.AddYears(-2),
                    IsActive = true
                }
            }
        });
    }
}
