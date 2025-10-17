using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PFMP_API.Models;
using PFMP_API.Services.FinancialProfile;
using TaskStatusModel = PFMP_API.Models.TaskStatus;

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
    var profileService = new FinancialProfileService(db, NullLogger<FinancialProfileService>.Instance, new MarketDataService(new HttpClient(), NullLogger<MarketDataService>.Instance, new ConfigurationBuilder().Build()));

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

        await profileService.UpsertLiabilitiesAsync(userId, new LiabilitiesInput
        {
            Liabilities = new List<LiabilityAccountInput>
            {
                new LiabilityAccountInput
                {
                    LiabilityType = "mortgage",
                    Lender = "USAA Mortgage Services",
                    CurrentBalance = 312000m,
                    InterestRateApr = 4.10m,
                    MinimumPayment = 2450m,
                    PayoffTargetDate = DateTime.UtcNow.AddYears(24),
                    IsPriorityToEliminate = false
                },
                new LiabilityAccountInput
                {
                    LiabilityType = "student-loan",
                    Lender = "Navient",
                    CurrentBalance = 18500m,
                    InterestRateApr = 5.20m,
                    MinimumPayment = 215m,
                    PayoffTargetDate = DateTime.UtcNow.AddYears(6),
                    IsPriorityToEliminate = true
                },
                new LiabilityAccountInput
                {
                    LiabilityType = "credit-card",
                    Lender = "Chase Sapphire",
                    CurrentBalance = 2200m,
                    InterestRateApr = 19.99m,
                    MinimumPayment = 65m,
                    PayoffTargetDate = DateTime.UtcNow.AddMonths(8),
                    IsPriorityToEliminate = true
                }
            }
        });

        await profileService.UpsertExpensesAsync(userId, new ExpensesInput
        {
            Expenses = new List<ExpenseBudgetInput>
            {
                new ExpenseBudgetInput { Category = "Housing", MonthlyAmount = 2450m, IsEstimated = false, Notes = "Primary residence mortgage" },
                new ExpenseBudgetInput { Category = "Utilities", MonthlyAmount = 320m, IsEstimated = true },
                new ExpenseBudgetInput { Category = "Transportation", MonthlyAmount = 540m, IsEstimated = false },
                new ExpenseBudgetInput { Category = "Childcare", MonthlyAmount = 780m, IsEstimated = true },
                new ExpenseBudgetInput { Category = "Insurance", MonthlyAmount = 310m, IsEstimated = false },
                new ExpenseBudgetInput { Category = "Lifestyle", MonthlyAmount = 650m, IsEstimated = true, Notes = "Dining, travel sinking fund" }
            }
        });

        await profileService.UpsertTaxProfileAsync(userId, new TaxProfileInput
        {
            FilingStatus = "married_joint",
            StateOfResidence = "VA",
            MarginalRatePercent = 24m,
            EffectiveRatePercent = 17.5m,
            FederalWithholdingPercent = 19m,
            ExpectedRefundAmount = 1200m,
            ExpectedPaymentAmount = null,
            UsesCpaOrPreparer = true,
            Notes = "CPA prepares return; review withholding after raise"
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

        await profileService.UpsertBenefitsAsync(userId, new BenefitsInput
        {
            Benefits = new List<BenefitCoverageInput>
            {
                new BenefitCoverageInput
                {
                    BenefitType = "401k_match",
                    Provider = "OPM",
                    IsEnrolled = true,
                    EmployerContributionPercent = 5m,
                    MonthlyCost = 0m,
                    Notes = "Automatic agency match"
                },
                new BenefitCoverageInput
                {
                    BenefitType = "health_hmo",
                    Provider = "Blue Cross Blue Shield",
                    IsEnrolled = true,
                    EmployerContributionPercent = 72m,
                    MonthlyCost = 310m,
                    Notes = "Family coverage, dental rider"
                },
                new BenefitCoverageInput
                {
                    BenefitType = "fsa_healthcare",
                    Provider = "OPM",
                    IsEnrolled = true,
                    EmployerContributionPercent = 0m,
                    MonthlyCost = 208.33m,
                    Notes = "Maxed HCFSA for the year"
                }
            }
        });

        await profileService.UpsertLongTermObligationsAsync(userId, new LongTermObligationsInput
        {
            Obligations = new List<LongTermObligationInput>
            {
                new LongTermObligationInput
                {
                    ObligationName = "Daughter's College Tuition",
                    ObligationType = "education",
                    TargetDate = DateTime.UtcNow.AddYears(6).AddMonths(2),
                    EstimatedCost = 95000m,
                    FundsAllocated = 27000m,
                    FundingStatus = "On Track",
                    IsCritical = true,
                    Notes = "529 plan contributions automated monthly"
                },
                new LongTermObligationInput
                {
                    ObligationName = "Primary Residence Renovation",
                    ObligationType = "home-improvement",
                    TargetDate = DateTime.UtcNow.AddYears(1).AddMonths(3),
                    EstimatedCost = 45000m,
                    FundsAllocated = 12000m,
                    FundingStatus = "Behind",
                    IsCritical = false,
                    Notes = "Kitchen + HVAC replacement"
                },
                new LongTermObligationInput
                {
                    ObligationName = "Vehicle Replacement",
                    ObligationType = "auto",
                    TargetDate = DateTime.UtcNow.AddMonths(-2),
                    EstimatedCost = 38000m,
                    FundsAllocated = 15000m,
                    FundingStatus = "Overdue",
                    IsCritical = true,
                    Notes = "Delayed due to supply constraints"
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

        await profileService.UpsertEquityInterestAsync(userId, new EquityInterestInput
        {
            IsInterestedInTracking = false,
            Notes = "Will revisit when RSU grant is issued"
        });

        await SeedAlertsAndTasksAsync(db, userId);
    }

    private static async Task SeedAlertsAndTasksAsync(ApplicationDbContext db, int userId)
    {
        var now = DateTime.UtcNow;

        if (!await db.Alerts.AnyAsync(a => a.UserId == userId))
        {
            var alerts = new List<Alert>
            {
                new Alert
                {
                    UserId = userId,
                    Title = "Rebalance TSP allocation",
                    Message = "Your C Fund allocation is 12% above target. Shift contributions to G/F to restore balance.",
                    Severity = AlertSeverity.High,
                    Category = AlertCategory.Rebalancing,
                    IsActionable = true,
                    CreatedAt = now.AddDays(-3),
                    PortfolioImpactScore = 82
                },
                new Alert
                {
                    UserId = userId,
                    Title = "Increase HYSA yield",
                    Message = "Your emergency fund is earning 0.10% APR. Move to a 4.25% HYSA to earn $720/year.",
                    Severity = AlertSeverity.Medium,
                    Category = AlertCategory.Portfolio,
                    IsActionable = true,
                    CreatedAt = now.AddDays(-9),
                    PortfolioImpactScore = 68
                },
                new Alert
                {
                    UserId = userId,
                    Title = "VA disability COLA update",
                    Message = "2026 COLA forecast increased to 2.4%. Review impact on cash flow plan.",
                    Severity = AlertSeverity.Low,
                    Category = AlertCategory.Performance,
                    IsActionable = false,
                    CreatedAt = now.AddDays(-15),
                    IsRead = true,
                    ReadAt = now.AddDays(-12),
                    PortfolioImpactScore = 35
                }
            };

            db.Alerts.AddRange(alerts);
            await db.SaveChangesAsync();

            if (!await db.Tasks.AnyAsync(t => t.UserId == userId))
            {
                var actionableAlerts = alerts.Where(a => a.IsActionable).ToList();
                var tasks = new List<UserTask>
                {
                    new UserTask
                    {
                        UserId = userId,
                        Title = "Shift 10% from C Fund to G Fund",
                        Description = "Reduce C Fund overweight and increase capital preservation per rebalancing policy.",
                        Type = TaskType.TSPAllocationChange,
                        Priority = TaskPriority.High,
                        Status = TaskStatusModel.InProgress,
                        CreatedDate = now.AddDays(-2),
                        DueDate = now.AddDays(5),
                        ProgressPercentage = 40,
                        EstimatedImpact = 1250m,
                        ImpactDescription = "Reduces volatility and captures employer match uptake.",
                        ConfidenceScore = 0.82m,
                        SourceAlertId = actionableAlerts.ElementAtOrDefault(0)?.AlertId,
                        SourceType = "Alert",
                        Notes = "Queued change in TSP portal; waiting for confirmation."
                    },
                    new UserTask
                    {
                        UserId = userId,
                        Title = "Open high-yield savings account",
                        Description = "Move emergency fund to Ally HYSA yielding 4.25% APR.",
                        Type = TaskType.CashOptimization,
                        Priority = TaskPriority.Medium,
                        Status = TaskStatusModel.Pending,
                        CreatedDate = now.AddDays(-1),
                        DueDate = now.AddDays(14),
                        EstimatedImpact = 720m,
                        ImpactDescription = "Additional annual interest from rate improvement.",
                        ConfidenceScore = 0.74m,
                        SourceAlertId = actionableAlerts.ElementAtOrDefault(1)?.AlertId,
                        SourceType = "Alert",
                        Notes = "Need to gather account statements before transfer."
                    },
                    new UserTask
                    {
                        UserId = userId,
                        Title = "Verify rental lease renewal",
                        Description = "Confirm renters renew at updated rate to maintain cash flow for renovation fund.",
                        Type = TaskType.GoalAdjustment,
                        Priority = TaskPriority.Medium,
                        Status = TaskStatusModel.Completed,
                        CreatedDate = now.AddDays(-30),
                        CompletedDate = now.AddDays(-5),
                        EstimatedImpact = 1800m,
                        ImpactDescription = "Locks in additional rental income for 12 months.",
                        ConfidenceScore = 0.65m,
                        SourceType = "Manual",
                        Notes = "Lease signed and filed in document vault.",
                        CompletionNotes = "Tenant accepted $150/mo increase starting next cycle."
                    }
                };

                db.Tasks.AddRange(tasks);
                await db.SaveChangesAsync();
            }
        }
    }
}
