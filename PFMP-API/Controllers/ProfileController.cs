using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using System.ComponentModel.DataAnnotations;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// User profile management and setup wizard API endpoints
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfileController> _logger;

        public ProfileController(ApplicationDbContext context, ILogger<ProfileController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get complete user profile information
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>User profile with setup status and demographics</returns>
        [HttpGet("{userId}")]
        public async Task<ActionResult<object>> GetProfile(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                // Calculate age from DateOfBirth
                int? age = null;
                if (user.DateOfBirth.HasValue)
                {
                    var today = DateTime.UtcNow;
                    age = today.Year - user.DateOfBirth.Value.Year;
                    if (user.DateOfBirth.Value.Date > today.AddYears(-age.Value).Date)
                        age--;
                }

                // Calculate years of service from ServiceComputationDate
                double? yearsOfService = null;
                if (user.ServiceComputationDate.HasValue)
                {
                    yearsOfService = (DateTime.UtcNow - user.ServiceComputationDate.Value).TotalDays / 365.25;
                }

                var profile = new
                {
                    user.UserId,
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    user.PhoneNumber,
                    
                    // Demographics
                    user.DateOfBirth,
                    Age = age,
                    user.EmploymentType,
                    user.PayGrade,
                    user.AnnualIncome,
                    user.RetirementSystem,
                    user.ServiceComputationDate,
                    YearsOfService = yearsOfService?.ToString("F1"),
                    
                    // Government Benefits
                    user.IsGovernmentEmployee,
                    user.GovernmentAgency,
                    user.VADisabilityPercentage,
                    user.VADisabilityMonthlyAmount,
                    
                    // Risk & Goals
                    user.RiskTolerance,
                    user.LastRiskAssessment,
                    user.EmergencyFundTarget,
                    user.RetirementGoalAmount,
                    user.TargetMonthlyPassiveIncome,
                    user.TargetRetirementDate,
                    
                    // Setup Status
                    user.ProfileSetupComplete,
                    user.ProfileCompletedAt,
                    user.SetupProgressPercentage,
                    SetupStepsCompleted = string.IsNullOrEmpty(user.SetupStepsCompleted) 
                        ? new string[0] 
                        : System.Text.Json.JsonSerializer.Deserialize<string[]>(user.SetupStepsCompleted),
                    
                    // Preferences
                    user.EnableRebalancingAlerts,
                    user.RebalancingThreshold,
                    user.EnableTaxOptimization,
                    user.EnablePushNotifications,
                    user.EnableEmailAlerts,
                    
                    // Metadata
                    user.CreatedAt,
                    user.UpdatedAt,
                    user.IsTestAccount
                };

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving profile for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving the user profile");
            }
        }

        /// <summary>
        /// Update user profile information
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="request">Profile update request</param>
        /// <returns>Updated profile information</returns>
        [HttpPut("{userId}")]
        public async Task<ActionResult<object>> UpdateProfile(int userId, [FromBody] UpdateProfileRequest request)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                // Update demographics
                if (!string.IsNullOrWhiteSpace(request.FirstName))
                    user.FirstName = request.FirstName.Trim();
                if (!string.IsNullOrWhiteSpace(request.LastName))
                    user.LastName = request.LastName.Trim();
                if (!string.IsNullOrWhiteSpace(request.Email))
                    user.Email = request.Email.Trim();
                if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
                    user.PhoneNumber = request.PhoneNumber.Trim();
                
                if (request.DateOfBirth.HasValue)
                    user.DateOfBirth = request.DateOfBirth.Value;
                if (!string.IsNullOrWhiteSpace(request.EmploymentType))
                    user.EmploymentType = request.EmploymentType.Trim();
                if (!string.IsNullOrWhiteSpace(request.PayGrade))
                    user.PayGrade = request.PayGrade.Trim();
                if (request.AnnualIncome.HasValue)
                    user.AnnualIncome = request.AnnualIncome.Value;
                if (!string.IsNullOrWhiteSpace(request.RetirementSystem))
                    user.RetirementSystem = request.RetirementSystem.Trim();
                if (request.ServiceComputationDate.HasValue)
                    user.ServiceComputationDate = request.ServiceComputationDate.Value;

                // Update government benefits
                if (request.IsGovernmentEmployee.HasValue)
                    user.IsGovernmentEmployee = request.IsGovernmentEmployee.Value;
                if (!string.IsNullOrWhiteSpace(request.GovernmentAgency))
                    user.GovernmentAgency = request.GovernmentAgency.Trim();
                if (request.VADisabilityPercentage.HasValue)
                    user.VADisabilityPercentage = request.VADisabilityPercentage.Value;
                if (request.VADisabilityMonthlyAmount.HasValue)
                    user.VADisabilityMonthlyAmount = request.VADisabilityMonthlyAmount.Value;

                // Update risk & goals
                if (request.RiskTolerance.HasValue)
                {
                    user.RiskTolerance = request.RiskTolerance.Value;
                    user.LastRiskAssessment = DateTime.UtcNow;
                }
                if (request.EmergencyFundTarget.HasValue)
                    user.EmergencyFundTarget = request.EmergencyFundTarget.Value;
                if (request.RetirementGoalAmount.HasValue)
                    user.RetirementGoalAmount = request.RetirementGoalAmount.Value;
                if (request.TargetMonthlyPassiveIncome.HasValue)
                    user.TargetMonthlyPassiveIncome = request.TargetMonthlyPassiveIncome.Value;
                if (request.TargetRetirementDate.HasValue)
                    user.TargetRetirementDate = request.TargetRetirementDate.Value;

                // Update preferences
                if (request.EnableRebalancingAlerts.HasValue)
                    user.EnableRebalancingAlerts = request.EnableRebalancingAlerts.Value;
                if (request.RebalancingThreshold.HasValue)
                    user.RebalancingThreshold = request.RebalancingThreshold.Value;
                if (request.EnableTaxOptimization.HasValue)
                    user.EnableTaxOptimization = request.EnableTaxOptimization.Value;
                if (request.EnablePushNotifications.HasValue)
                    user.EnablePushNotifications = request.EnablePushNotifications.Value;
                if (request.EnableEmailAlerts.HasValue)
                    user.EnableEmailAlerts = request.EnableEmailAlerts.Value;

                // Update metadata
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Profile updated for user {UserId}", userId);

                // Return updated profile using the GET method logic
                return await GetProfile(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
                return StatusCode(500, "An error occurred while updating the user profile");
            }
        }

        /// <summary>
        /// Get setup wizard progress for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Setup progress information</returns>
        [HttpGet("setup/progress/{userId}")]
        public async Task<ActionResult<object>> GetSetupProgress(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                // Parse completed steps
                string[] completedSteps = new string[0];
                if (!string.IsNullOrEmpty(user.SetupStepsCompleted))
                {
                    try
                    {
                        completedSteps = System.Text.Json.JsonSerializer.Deserialize<string[]>(user.SetupStepsCompleted) ?? new string[0];
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        _logger.LogWarning("Invalid JSON in SetupStepsCompleted for user {UserId}", userId);
                    }
                }

                // Define all required setup steps
                var allSteps = new[]
                {
                    "demographics",
                    "employment",
                    "military-benefits",
                    "financial-goals",
                    "risk-assessment",
                    "account-setup"
                };

                var progress = new
                {
                    user.UserId,
                    user.ProfileSetupComplete,
                    user.SetupProgressPercentage,
                    user.ProfileCompletedAt,
                    CompletedSteps = completedSteps,
                    RemainingSteps = allSteps.Except(completedSteps).ToArray(),
                    NextStep = allSteps.Except(completedSteps).FirstOrDefault(),
                    TotalSteps = allSteps.Length,
                    CompletedCount = completedSteps.Length,
                    
                    // Step validation
                    StepStatus = new
                    {
                        Demographics = completedSteps.Contains("demographics"),
                        Employment = completedSteps.Contains("employment"),
                        MilitaryBenefits = completedSteps.Contains("military-benefits"),
                        FinancialGoals = completedSteps.Contains("financial-goals"),
                        RiskAssessment = completedSteps.Contains("risk-assessment"),
                        AccountSetup = completedSteps.Contains("account-setup")
                    }
                };

                return Ok(progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving setup progress for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving setup progress");
            }
        }

        /// <summary>
        /// Mark a setup step as completed
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="request">Step completion request</param>
        /// <returns>Updated setup progress</returns>
        [HttpPost("setup/complete-step/{userId}")]
        public async Task<ActionResult<object>> CompleteSetupStep(int userId, [FromBody] CompleteStepRequest request)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                // Parse existing completed steps
                var completedSteps = new List<string>();
                if (!string.IsNullOrEmpty(user.SetupStepsCompleted))
                {
                    try
                    {
                        var existingSteps = System.Text.Json.JsonSerializer.Deserialize<string[]>(user.SetupStepsCompleted);
                        if (existingSteps != null)
                            completedSteps.AddRange(existingSteps);
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        _logger.LogWarning("Invalid JSON in SetupStepsCompleted for user {UserId}, resetting", userId);
                    }
                }

                // Add new step if not already completed
                if (!completedSteps.Contains(request.StepName))
                {
                    completedSteps.Add(request.StepName);
                }

                // Update user record
                user.SetupStepsCompleted = System.Text.Json.JsonSerializer.Serialize(completedSteps.ToArray());
                
                // Calculate progress percentage
                var totalSteps = 6; // demographics, employment, military-benefits, financial-goals, risk-assessment, account-setup
                user.SetupProgressPercentage = (int)Math.Round((double)completedSteps.Count / totalSteps * 100);

                // Mark profile as complete if all steps are done
                if (completedSteps.Count >= totalSteps)
                {
                    user.ProfileSetupComplete = true;
                    user.ProfileCompletedAt = DateTime.UtcNow;
                }

                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Setup step '{StepName}' completed for user {UserId}. Progress: {Progress}%", 
                    request.StepName, userId, user.SetupProgressPercentage);

                // Return updated progress
                return await GetSetupProgress(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing setup step for user {UserId}", userId);
                return StatusCode(500, "An error occurred while completing the setup step");
            }
        }

        /// <summary>
        /// Reset user setup progress (for testing or support scenarios)
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Reset confirmation</returns>
        [HttpPost("setup/reset/{userId}")]
        public async Task<ActionResult<object>> ResetSetupProgress(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found");
                }

                // Reset setup progress
                user.ProfileSetupComplete = false;
                user.ProfileCompletedAt = null;
                user.SetupProgressPercentage = 0;
                user.SetupStepsCompleted = "[]";
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Setup progress reset for user {UserId}", userId);

                return Ok(new { 
                    Success = true, 
                    Message = $"Setup progress reset for user {userId}",
                    UserId = userId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting setup progress for user {UserId}", userId);
                return StatusCode(500, "An error occurred while resetting setup progress");
            }
        }
    }

    /// <summary>
    /// Request model for profile updates
    /// </summary>
    public class UpdateProfileRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        public string? EmploymentType { get; set; }
        public string? PayGrade { get; set; }
        public decimal? AnnualIncome { get; set; }
        public string? RetirementSystem { get; set; }
        public DateTime? ServiceComputationDate { get; set; }
        
        public bool? IsGovernmentEmployee { get; set; }
        public string? GovernmentAgency { get; set; }
        public int? VADisabilityPercentage { get; set; }
        public decimal? VADisabilityMonthlyAmount { get; set; }
        
        [Range(1, 10)]
        public int? RiskTolerance { get; set; }
        public decimal? EmergencyFundTarget { get; set; }
        public decimal? RetirementGoalAmount { get; set; }
        public decimal? TargetMonthlyPassiveIncome { get; set; }
        public DateTime? TargetRetirementDate { get; set; }
        
        public bool? EnableRebalancingAlerts { get; set; }
        public decimal? RebalancingThreshold { get; set; }
        public bool? EnableTaxOptimization { get; set; }
        public bool? EnablePushNotifications { get; set; }
        public bool? EnableEmailAlerts { get; set; }
    }

    /// <summary>
    /// Request model for completing setup steps
    /// </summary>
    public class CompleteStepRequest
    {
        [Required]
        public string StepName { get; set; } = string.Empty;
    }
}