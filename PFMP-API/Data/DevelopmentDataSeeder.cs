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
        }
    }
}