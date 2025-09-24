using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API
{
    /// <summary>
    /// Seeds development/testing data for bypassing authentication during development
    /// </summary>
    public static class DevelopmentDataSeeder
    {
        public static async Task SeedDevelopmentData(ApplicationDbContext context)
        {
            // Only seed if no test accounts exist
            if (await context.Users.AnyAsync(u => u.IsTestAccount))
                return;

            var testUsers = new List<User>
            {
                // Test User 1: Young Federal Employee (like 21-year-old starting career)
                new User
                {
                    FirstName = "Sarah",
                    LastName = "Johnson",
                    Email = "sarah.johnson@test.gov",
                    IsTestAccount = true,
                    BypassAuthentication = true,
                    ProfileSetupComplete = true,
                    DateOfBirth = DateTime.UtcNow.AddYears(-22), // 22 years old
                    EmploymentType = "Federal",
                    GovernmentAgency = "Department of Defense",
                    PayGrade = "GS-07",
                    ServiceComputationDate = DateTime.UtcNow.AddYears(-1), // 1 year of service
                    RetirementSystem = "FERS",
                    AnnualIncome = 42000m,
                    RiskTolerance = 8, // High risk tolerance (young)
                    TargetRetirementDate = DateTime.UtcNow.AddYears(40), // Retire at 62
                    RetirementGoalAmount = 1500000m,
                    EmergencyFundTarget = 15000m,
                    SetupProgressPercentage = 100,
                    SetupStepsCompleted = "[\"demographics\",\"tsp\",\"goals\",\"risk-assessment\"]"
                },

                // Test User 2: Mid-Career Federal Employee (like your 43-year-old scenario)
                new User
                {
                    FirstName = "Michael",
                    LastName = "Smith", 
                    Email = "michael.smith@test.gov",
                    IsTestAccount = true,
                    BypassAuthentication = true,
                    ProfileSetupComplete = true,
                    DateOfBirth = DateTime.UtcNow.AddYears(-43), // 43 years old
                    EmploymentType = "Federal",
                    GovernmentAgency = "Department of Veterans Affairs",
                    PayGrade = "GS-13",
                    ServiceComputationDate = DateTime.UtcNow.AddYears(-15), // 15 years of service
                    RetirementSystem = "FERS",
                    AnnualIncome = 92000m,
                    RiskTolerance = 6, // Moderate risk tolerance
                    TargetRetirementDate = DateTime.UtcNow.AddYears(17), // Retire at 60
                    RetirementGoalAmount = 2200000m,
                    EmergencyFundTarget = 50000m,
                    VADisabilityPercentage = 30,
                    VADisabilityMonthlyAmount = 524.31m, // 2024 30% rate
                    SetupProgressPercentage = 100,
                    SetupStepsCompleted = "[\"demographics\",\"tsp\",\"va-disability\",\"goals\",\"risk-assessment\"]"
                },

                // Test User 3: Military Member
                new User
                {
                    FirstName = "Jessica",
                    LastName = "Rodriguez",
                    Email = "jessica.rodriguez@test.mil",
                    IsTestAccount = true,
                    BypassAuthentication = true,
                    ProfileSetupComplete = true,
                    DateOfBirth = DateTime.UtcNow.AddYears(-28), // 28 years old
                    EmploymentType = "Military", 
                    GovernmentAgency = "U.S. Air Force",
                    PayGrade = "E-6",
                    ServiceComputationDate = DateTime.UtcNow.AddYears(-8), // 8 years of service
                    RetirementSystem = "Military",
                    AnnualIncome = 65000m,
                    RiskTolerance = 7, // Moderate-high risk tolerance
                    TargetRetirementDate = DateTime.UtcNow.AddYears(12), // 20-year military retirement
                    RetirementGoalAmount = 1800000m,
                    EmergencyFundTarget = 25000m,
                    SetupProgressPercentage = 100,
                    SetupStepsCompleted = "[\"demographics\",\"tsp\",\"military-benefits\",\"goals\"]"
                },

                // Test User 4: New User (Incomplete Setup) - for testing setup wizard
                new User
                {
                    FirstName = "David",
                    LastName = "Wilson",
                    Email = "david.wilson@test.gov",
                    IsTestAccount = true,
                    BypassAuthentication = true,
                    ProfileSetupComplete = false,
                    DateOfBirth = DateTime.UtcNow.AddYears(-26), // 26 years old
                    EmploymentType = "Federal",
                    PayGrade = "GS-09",
                    AnnualIncome = 55000m,
                    SetupProgressPercentage = 25, // Partially complete
                    SetupStepsCompleted = "[\"demographics\"]"
                }
            };

            context.Users.AddRange(testUsers);
            await context.SaveChangesAsync();

            // Seed sample accounts for realistic AI testing
            await SeedSampleAccounts(context);
            
            // Seed sample goals
            await SeedSampleGoals(context);
        }

        private static async Task SeedSampleAccounts(ApplicationDbContext context)
        {
            // Only seed if no accounts exist
            if (await context.Accounts.AnyAsync())
                return;

            var sampleAccounts = new List<Account>
            {
                // Sarah Johnson (ID: 1) - Young employee accounts
                new Account
                {
                    UserId = 1,
                    AccountName = "Sarah's TSP",
                    AccountType = AccountType.TSP,
                    Category = AccountCategory.TaxDeferred,
                    Institution = "Thrift Savings Plan",
                    AccountNumber = "1234",
                    CurrentBalance = 25000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },
                new Account
                {
                    UserId = 1,
                    AccountName = "Roth IRA",
                    AccountType = AccountType.RetirementAccountRoth,
                    Category = AccountCategory.TaxFree,
                    Institution = "Vanguard",
                    AccountNumber = "5678",
                    CurrentBalance = 15000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },
                new Account
                {
                    UserId = 1,
                    AccountName = "Emergency Savings",
                    AccountType = AccountType.Savings,
                    Category = AccountCategory.Cash,
                    Institution = "USAA",
                    AccountNumber = "9012",
                    CurrentBalance = 5000m,
                    IsEmergencyFund = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },

                // Michael Smith (ID: 2) - Mid-career employee accounts
                new Account
                {
                    UserId = 2,
                    AccountName = "Michael's TSP",
                    AccountType = AccountType.TSP,
                    Category = AccountCategory.TaxDeferred,
                    Institution = "Thrift Savings Plan",
                    AccountNumber = "2468",
                    CurrentBalance = 185000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },
                new Account
                {
                    UserId = 2,
                    AccountName = "Traditional IRA",
                    AccountType = AccountType.RetirementAccountIRA,
                    Category = AccountCategory.TaxDeferred,
                    Institution = "Fidelity",
                    AccountNumber = "1357",
                    CurrentBalance = 45000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },
                new Account
                {
                    UserId = 2,
                    AccountName = "Emergency Fund",
                    AccountType = AccountType.Savings,
                    Category = AccountCategory.Cash,
                    Institution = "Navy Federal",
                    AccountNumber = "2468",
                    CurrentBalance = 30000m,
                    IsEmergencyFund = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },

                // Jessica Rodriguez (ID: 3) - Military member accounts
                new Account
                {
                    UserId = 3,
                    AccountName = "Military TSP",
                    AccountType = AccountType.TSP,
                    Category = AccountCategory.TaxDeferred,
                    Institution = "Thrift Savings Plan",
                    AccountNumber = "3691",
                    CurrentBalance = 85000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                },
                new Account
                {
                    UserId = 3,
                    AccountName = "Roth TSP",
                    AccountType = AccountType.TSP,
                    Category = AccountCategory.TaxFree,
                    Institution = "Thrift Savings Plan",
                    AccountNumber = "3692",
                    CurrentBalance = 25000m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastBalanceUpdate = DateTime.UtcNow
                }
            };

            context.Accounts.AddRange(sampleAccounts);
            await context.SaveChangesAsync();
        }

        private static async Task SeedSampleGoals(ApplicationDbContext context)
        {
            // Only seed if no goals exist
            if (await context.Goals.AnyAsync())
                return;

            var sampleGoals = new List<Goal>
            {
                // Sarah's goals
                new Goal
                {
                    UserId = 1,
                    Name = "Emergency Fund (6 months)",
                    Description = "Build emergency fund to cover 6 months of expenses",
                    Type = GoalType.EmergencyFund,
                    Category = GoalCategory.ShortTerm,
                    TargetAmount = 15000m,
                    CurrentAmount = 5000m,
                    TargetDate = DateTime.UtcNow.AddMonths(18),
                    Priority = 5, // High priority
                    Status = GoalStatus.Active,
                    MonthsOfExpenses = 6,
                    MonthlyExpenses = 2500m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Goal
                {
                    UserId = 1,
                    Name = "House Down Payment",
                    Description = "Save for 20% down payment on first home",
                    Type = GoalType.HouseDownPayment,
                    Category = GoalCategory.MediumTerm,
                    TargetAmount = 50000m,
                    CurrentAmount = 8000m,
                    TargetDate = DateTime.UtcNow.AddYears(4),
                    Priority = 3, // Medium priority
                    Status = GoalStatus.Active,
                    Strategy = GoalStrategy.Growth,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Michael's goals
                new Goal
                {
                    UserId = 2,
                    Name = "Retirement at 60",
                    Description = "Achieve financial independence by age 60",
                    Type = GoalType.Retirement,
                    Category = GoalCategory.LongTerm,
                    TargetAmount = 2200000m,
                    CurrentAmount = 230000m,
                    TargetDate = DateTime.UtcNow.AddYears(17),
                    Priority = 5, // High priority
                    Status = GoalStatus.OnTrack,
                    Strategy = GoalStrategy.Balanced,
                    RetirementAgeTarget = 60,
                    TargetMonthlyIncome = 7500m,
                    ExpectedAnnualReturn = 0.07m,
                    WithdrawalRate = 0.04m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Goal
                {
                    UserId = 2,
                    Name = "Daughter's College Fund",
                    Description = "Save for daughter's college education",
                    Type = GoalType.Education,
                    Category = GoalCategory.MediumTerm,
                    TargetAmount = 100000m,
                    CurrentAmount = 25000m,
                    TargetDate = DateTime.UtcNow.AddYears(10),
                    Priority = 4, // High priority
                    Status = GoalStatus.Active,
                    Strategy = GoalStrategy.Growth,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Jessica's goals
                new Goal
                {
                    UserId = 3,
                    Name = "Military Retirement Bridge",
                    Description = "Bridge fund from military retirement to full retirement",
                    Type = GoalType.Retirement,
                    Category = GoalCategory.LongTerm,
                    TargetAmount = 500000m,
                    CurrentAmount = 110000m,
                    TargetDate = DateTime.UtcNow.AddYears(12),
                    Priority = 5, // High priority
                    Status = GoalStatus.OnTrack,
                    Strategy = GoalStrategy.Balanced,
                    RetirementAgeTarget = 40, // Military retirement at 20 years
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.Goals.AddRange(sampleGoals);
            await context.SaveChangesAsync();
        }
    }
}