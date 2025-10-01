using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Services;

namespace PFMP_API.Services
{
    /// <summary>
    /// Wave 1 stub implementation: wraps existing AI portfolio analysis into an Advice record.
    /// Future waves will add validator + rule evaluation + structured JSON.
    /// </summary>
    public class AdviceService : IAdviceService
    {
        private readonly ApplicationDbContext _db;
        private readonly IAIService _aiService;
    private readonly IAdviceValidator _validator;
    private readonly ILogger<AdviceService> _logger;

        public AdviceService(ApplicationDbContext db, IAIService aiService, IAdviceValidator validator, ILogger<AdviceService> logger)
        {
            _db = db;
            _aiService = aiService;
            _validator = validator;
            _logger = logger;
        }

        public async Task<Advice> GenerateBasicAdviceAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new ArgumentException($"User {userId} not found");
            }

            string analysisText = string.Empty;
            try
            {
                analysisText = await _aiService.AnalyzePortfolioAsync(userId) ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI analysis failed for user {UserId}; using fallback", userId);
                analysisText = "Unable to retrieve AI analysis at this time. Please try again later.";
            }

            // Trim & bound length (simple safety net)
            if (analysisText.Length > 8000)
            {
                analysisText = analysisText.Substring(0, 8000) + "...";
            }

            var advice = new Advice
            {
                UserId = userId,
                Theme = "General",
                Status = "Proposed",
                ConsensusText = analysisText.Trim(),
                ConfidenceScore = 60,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Run validator stub
            try
            {
                var validation = await _validator.ValidateAsync(advice);
                advice.ValidatorJson = System.Text.Json.JsonSerializer.Serialize(validation);
                advice.ViolationsJson = validation.Issues.Any() ? System.Text.Json.JsonSerializer.Serialize(validation.Issues) : null;
                var adjusted = advice.ConfidenceScore + (int)validation.HeuristicConfidenceAdjustment;
                advice.ConfidenceScore = Math.Clamp(adjusted, 0, 100);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Validator failed for advice user {UserId}; continuing without validation enrichment", userId);
            }

            _db.Advice.Add(advice);
            await _db.SaveChangesAsync();
            return advice;
        }

        public async Task<IEnumerable<Advice>> GetAdviceForUserAsync(int userId, string? status = null, bool includeDismissed = false)
        {
            var query = _db.Advice.AsQueryable().Where(a => a.UserId == userId);
            if (!includeDismissed)
            {
                query = query.Where(a => a.Status != "Dismissed");
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(a => a.Status == status);
            }
            return await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        }

        public async Task<Advice?> AcceptAdviceAsync(int adviceId)
        {
            var advice = await _db.Advice.FirstOrDefaultAsync(a => a.AdviceId == adviceId);
            if (advice == null) return null;
            // If already accepted, still ensure provenance fields on linked task are populated before returning.
            if (advice.Status == "Accepted")
            {
                if (advice.LinkedTaskId != null)
                {
                    var existingTask = await _db.Tasks.FirstOrDefaultAsync(t => t.TaskId == advice.LinkedTaskId);
                    if (existingTask != null)
                    {
                        bool changed = false;
                        if (existingTask.SourceAdviceId == null)
                        {
                            existingTask.SourceAdviceId = advice.AdviceId;
                            changed = true;
                        }
                        if (string.IsNullOrEmpty(existingTask.SourceType))
                        {
                            existingTask.SourceType = "Advice";
                            changed = true;
                        }
                        if (changed)
                        {
                            await _db.SaveChangesAsync();
                        }
                    }
                }
                return advice; // idempotent with provenance assurance
            }

            if (advice.Status == "Dismissed")
            {
                // Direct accept overrides dismissal.
                advice.PreviousStatus = "Dismissed";
            }

            if (advice.LinkedTaskId == null)
            {
                // Create task on first acceptance.
                var task = new UserTask
                {
                    UserId = advice.UserId,
                    Type = TaskType.GoalAdjustment,
                    Title = (advice.Theme ?? "Advice") + " Action",
                    Description = advice.ConsensusText.Length > 500 ? advice.ConsensusText[..500] + "..." : advice.ConsensusText,
                    Priority = TaskPriority.Medium,
                    Status = Models.TaskStatus.Pending,
                    CreatedDate = DateTime.UtcNow,
                    SourceAlertId = advice.SourceAlertId,
                    SourceAdviceId = advice.AdviceId,
                    SourceType = "Advice"
                };
                _db.Tasks.Add(task);
                await _db.SaveChangesAsync();
                advice.LinkedTaskId = task.TaskId;
            }
            else
            {
                // Ensure existing linked task has provenance fields populated (in case of earlier omission)
                var existingTask = await _db.Tasks.FirstOrDefaultAsync(t => t.TaskId == advice.LinkedTaskId);
                if (existingTask != null)
                {
                    bool changed = false;
                    if (existingTask.SourceAdviceId == null)
                    {
                        existingTask.SourceAdviceId = advice.AdviceId;
                        changed = true;
                    }
                    if (string.IsNullOrEmpty(existingTask.SourceType))
                    {
                        existingTask.SourceType = "Advice";
                        changed = true;
                    }
                    if (changed)
                    {
                        await _db.SaveChangesAsync();
                    }
                }
            }

            advice.Status = "Accepted";
            advice.AcceptedAt = advice.AcceptedAt ?? DateTime.UtcNow;
            advice.UpdatedAt = DateTime.UtcNow;
            advice.DismissedAt = null; // ensure cleared if previously dismissed
            await _db.SaveChangesAsync();
            return advice;
        }

        public async Task<Advice?> DismissAdviceAsync(int adviceId)
        {
            var advice = await _db.Advice.FirstOrDefaultAsync(a => a.AdviceId == adviceId);
            if (advice == null) return null;
            if (advice.Status == "Dismissed") return advice; // idempotent
            if (advice.Status == "Accepted")
            {
                throw new InvalidOperationException("Cannot dismiss advice that is already Accepted");
            }
            advice.PreviousStatus = advice.Status;
            advice.Status = "Dismissed";
            advice.DismissedAt = DateTime.UtcNow;
            advice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return advice;
        }

        public async Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId, bool includeSnapshot = true)
        {
            var alert = await _db.Alerts.FirstOrDefaultAsync(a => a.AlertId == alertId && a.UserId == userId);
            if (alert == null)
            {
                throw new ArgumentException($"Alert {alertId} not found for user {userId}");
            }

            var baseText = $"Alert: {alert.Title}\n{alert.Message}";
            string enriched = baseText;
            try
            {
                // Attempt AI expansion - fallback to base alert text if fails
                var analysis = await _aiService.AnalyzePortfolioAsync(userId) ?? string.Empty;
                enriched = (analysis.Length > 0 ? analysis + "\n\n" : string.Empty) + baseText;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI enrichment failed for alert advice generation {AlertId}", alertId);
            }

            if (enriched.Length > 8000) enriched = enriched[..8000] + "...";

            var advice = new Advice
            {
                UserId = userId,
                Theme = alert.Category.ToString(),
                Status = "Proposed",
                ConsensusText = enriched,
                ConfidenceScore = 55,
                SourceAlertId = alert.AlertId,
                GenerationMethod = "FromAlert",
                SourceAlertSnapshot = includeSnapshot ? System.Text.Json.JsonSerializer.Serialize(new
                {
                    alert.AlertId,
                    alert.Title,
                    alert.Message,
                    alert.Category,
                    alert.Severity,
                    alert.CreatedAt
                }) : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Apply validator heuristic
            try
            {
                var validation = await _validator.ValidateAsync(advice);
                advice.ValidatorJson = System.Text.Json.JsonSerializer.Serialize(validation);
                advice.ViolationsJson = validation.Issues.Any() ? System.Text.Json.JsonSerializer.Serialize(validation.Issues) : null;
                advice.ConfidenceScore = Math.Clamp(advice.ConfidenceScore + (int)validation.HeuristicConfidenceAdjustment, 0, 100);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Validator failed for alert-derived advice {AlertId}", alertId);
            }

            _db.Advice.Add(advice);
            await _db.SaveChangesAsync();
            return advice;
        }
    }
}
