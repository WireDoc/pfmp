using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Services;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlertsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AlertsController> _logger;
        private readonly IAIService _aiService;

        public AlertsController(ApplicationDbContext context, ILogger<AlertsController> logger, IAIService aiService)
        {
            _context = context;
            _logger = logger;
            _aiService = aiService;
        }

        /// <summary>
        /// Gets all alerts for a specific user
        /// </summary>
        /// <param name="userId">User ID to filter alerts</param>
        /// <param name="isActive">Optional filter for active alerts only</param>
        /// <returns>List of alerts</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Alert>>> GetAlerts(
            [FromQuery] int userId,
            [FromQuery] bool? isActive = null,
            [FromQuery] bool? isRead = null,
            [FromQuery] bool? isDismissed = null)
        {
            try
            {
                var query = _context.Alerts
                    .Where(a => a.UserId == userId);

                if (isActive.HasValue)
                {
                    // Active = not dismissed AND not expired
                    if (isActive.Value)
                        query = query.Where(a => !a.IsDismissed && (a.ExpiresAt == null || a.ExpiresAt > DateTime.UtcNow));
                    else
                        query = query.Where(a => a.IsDismissed || (a.ExpiresAt != null && a.ExpiresAt <= DateTime.UtcNow));
                }

                if (isRead.HasValue)
                    query = query.Where(a => a.IsRead == isRead.Value);

                if (isDismissed.HasValue)
                    query = query.Where(a => a.IsDismissed == isDismissed.Value);

                var alerts = await query
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                return Ok(alerts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alerts for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving alerts");
            }
        }

        /// <summary>
        /// Gets a specific alert by ID
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <returns>Alert details</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Alert>> GetAlert(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                return Ok(alert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alert {AlertId}", id);
                return StatusCode(500, "An error occurred while retrieving the alert");
            }
        }

        /// <summary>
        /// Creates a new alert
        /// </summary>
        /// <param name="alert">Alert to create</param>
        /// <returns>Created alert</returns>
        [HttpPost]
        public async Task<ActionResult<Alert>> CreateAlert([FromBody] Alert alert)
        {
            try
            {
                if (alert == null)
                {
                    return BadRequest("Alert data is required");
                }

                alert.CreatedAt = DateTime.UtcNow;
                alert.IsRead = false;
                alert.IsDismissed = false;

                _context.Alerts.Add(alert);
                await _context.SaveChangesAsync();

                // Generate task if alert is actionable
                if (alert.IsActionable && !alert.TaskGenerated)
                {
                    await GenerateTaskFromAlert(alert);
                }

                _logger.LogInformation("Created alert {AlertId} for user {UserId}", alert.AlertId, alert.UserId);
                return CreatedAtAction(nameof(GetAlert), new { id = alert.AlertId }, alert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alert for user {UserId}", alert?.UserId);
                return StatusCode(500, "An error occurred while creating the alert");
            }
        }

        /// <summary>
        /// Updates an existing alert
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <param name="alert">Updated alert data</param>
        /// <returns>Updated alert</returns>
        [HttpPut("{id}")]
        public async Task<ActionResult<Alert>> UpdateAlert(int id, [FromBody] Alert alert)
        {
            try
            {
                if (alert == null || id != alert.AlertId)
                {
                    return BadRequest("Invalid alert data or ID mismatch");
                }

                var existingAlert = await _context.Alerts.FindAsync(id);
                if (existingAlert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                // Update properties
                existingAlert.Title = alert.Title;
                existingAlert.Message = alert.Message;
                existingAlert.Category = alert.Category;
                existingAlert.Severity = alert.Severity;
                existingAlert.IsActionable = alert.IsActionable;
                existingAlert.ActionUrl = alert.ActionUrl;
                existingAlert.ExpiresAt = alert.ExpiresAt;
                existingAlert.Metadata = alert.Metadata;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated alert {AlertId}", id);
                return Ok(existingAlert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alert {AlertId}", id);
                return StatusCode(500, "An error occurred while updating the alert");
            }
        }

        /// <summary>
        /// Marks an alert as read
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <returns>Success response</returns>
        [HttpPatch("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                alert.IsRead = true;
                alert.ReadAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Marked alert {AlertId} as read", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking alert {AlertId} as read", id);
                return StatusCode(500, "An error occurred while marking the alert as read");
            }
        }

        /// <summary>
        /// Dismisses an alert (marks as dismissed)
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <returns>Success response</returns>
        [HttpPatch("{id}/dismiss")]
        public async Task<ActionResult> DismissAlert(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                alert.IsDismissed = true;
                alert.DismissedAt = DateTime.UtcNow;
                
                // Also mark as read if not already
                if (!alert.IsRead)
                {
                    alert.IsRead = true;
                    alert.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Dismissed alert {AlertId}", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dismissing alert {AlertId}", id);
                return StatusCode(500, "An error occurred while dismissing the alert");
            }
        }

        /// <summary>
        /// Un-dismisses an alert (allows user to see dismissed alert again)
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <returns>Success response</returns>
        [HttpPatch("{id}/undismiss")]
        public async Task<ActionResult> UndismissAlert(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                alert.IsDismissed = false;
                alert.DismissedAt = null;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Un-dismissed alert {AlertId}", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error un-dismissing alert {AlertId}", id);
                return StatusCode(500, "An error occurred while un-dismissing the alert");
            }
        }

        /// <summary>
        /// Deletes an alert
        /// </summary>
        /// <param name="id">Alert ID</param>
        /// <returns>Success response</returns>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAlert(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {id} not found");
                }

                _context.Alerts.Remove(alert);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted alert {AlertId}", id);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alert {AlertId}", id);
                return StatusCode(500, "An error occurred while deleting the alert");
            }
        }

        // AI-Powered Alert Management

        /// <summary>
        /// Generates AI-powered market alerts for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of generated market alerts</returns>
        [HttpPost("ai/generate-market-alerts")]
        public async Task<ActionResult<IEnumerable<Alert>>> GenerateMarketAlerts([FromQuery] int userId)
        {
            try
            {
                _logger.LogInformation("Generating AI market alerts for user {UserId}", userId);
                var aiAlerts = await _aiService.GenerateMarketAlertsAsync(userId);

                // Save generated alerts to database
                foreach (var alert in aiAlerts)
                {
                    _context.Alerts.Add(alert);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Generated {Count} AI market alerts for user {UserId}", aiAlerts.Count, userId);
                return Ok(aiAlerts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating AI market alerts for user {UserId}", userId);
                return StatusCode(500, "An error occurred while generating market alerts");
            }
        }

        /// <summary>
        /// Gets AI-powered portfolio analysis with alerting insights
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Portfolio analysis with alert recommendations</returns>
        [HttpGet("ai/portfolio-insights")]
        public async Task<ActionResult<object>> GetPortfolioInsights([FromQuery] int userId)
        {
            try
            {
                _logger.LogInformation("Generating AI portfolio insights for user {UserId}", userId);
                
                var analysis = await _aiService.AnalyzePortfolioAsync(userId);
                var alerts = await _aiService.GenerateMarketAlertsAsync(userId);

                var insights = new
                {
                    Analysis = analysis,
                    RecommendedAlerts = alerts,
                    Timestamp = DateTime.UtcNow
                };

                return Ok(insights);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating portfolio insights for user {UserId}", userId);
                return StatusCode(500, "An error occurred while generating portfolio insights");
            }
        }

        /// <summary>
        /// Gets alert analytics for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Alert analytics data</returns>
        [HttpGet("analytics")]
        public async Task<ActionResult<object>> GetAlertAnalytics([FromQuery] int userId)
        {
            try
            {
                var alerts = await _context.Alerts
                    .Where(a => a.UserId == userId)
                    .ToListAsync();

                var activeAlerts = alerts.Where(a => !a.IsDismissed && (a.ExpiresAt == null || a.ExpiresAt > DateTime.UtcNow));
                
                var analytics = new
                {
                    TotalAlerts = alerts.Count,
                    ActiveAlerts = activeAlerts.Count(),
                    UnreadAlerts = alerts.Count(a => !a.IsRead),
                    ReadAlerts = alerts.Count(a => a.IsRead),
                    DismissedAlerts = alerts.Count(a => a.IsDismissed),
                    ExpiredAlerts = alerts.Count(a => a.ExpiresAt != null && a.ExpiresAt <= DateTime.UtcNow),
                    ActionableAlerts = alerts.Count(a => a.IsActionable),
                    TaskGeneratedAlerts = alerts.Count(a => a.TaskGenerated),
                    AlertsByCategory = alerts.GroupBy(a => a.Category)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                    AlertsBySeverity = alerts.GroupBy(a => a.Severity)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                    RecentAlerts = alerts.OrderByDescending(a => a.CreatedAt)
                        .Take(5)
                        .Select(a => new { a.AlertId, a.Title, a.Category, a.Severity, a.CreatedAt, a.IsRead, a.IsDismissed })
                };

                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving alert analytics for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving alert analytics");
            }
        }

        /// <summary>
        /// Generates a task for an actionable alert
        /// </summary>
        /// <param name="alertId">Alert ID</param>
        /// <returns>Created task</returns>
        [HttpPost("{alertId}/generate-task")]
        public async Task<ActionResult<UserTask>> GenerateTaskFromAlert(int alertId)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(alertId);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {alertId} not found");
                }

                if (!alert.IsActionable)
                {
                    return BadRequest("Alert is not actionable");
                }

                if (alert.TaskGenerated)
                {
                    return BadRequest("Task has already been generated for this alert");
                }

                var task = await GenerateTaskFromAlert(alert);
                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating task from alert {AlertId}", alertId);
                return StatusCode(500, "An error occurred while generating task from alert");
            }
        }

        /// <summary>
        /// Private method to generate a task from an alert
        /// </summary>
        private async Task<UserTask> GenerateTaskFromAlert(Alert alert)
        {
            // Create task based on alert category and content
            var taskType = MapAlertCategoryToTaskType(alert.Category);
            var taskPriority = MapAlertSeverityToTaskPriority(alert.Severity);

            var task = new UserTask
            {
                UserId = alert.UserId,
                Title = $"Action Required: {alert.Title}",
                Description = alert.Message,
                Type = taskType,
                Priority = taskPriority,
                Status = Models.TaskStatus.Pending,
                CreatedDate = DateTime.UtcNow,
                DueDate = alert.ExpiresAt ?? DateTime.UtcNow.AddDays(7), // Default 7 days if no expiry
                SourceAlertId = alert.AlertId,
                Notes = "Generated from alert system"
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Update alert to mark task as generated
            alert.GeneratedTaskId = task.TaskId;
            alert.TaskGenerated = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Generated task {TaskId} from alert {AlertId}", task.TaskId, alert.AlertId);
            return task;
        }

        /// <summary>
        /// Maps alert category to appropriate task type
        /// </summary>
        private Models.TaskType MapAlertCategoryToTaskType(AlertCategory category)
        {
            return category switch
            {
                AlertCategory.Portfolio => Models.TaskType.Rebalancing,
                AlertCategory.Goal => Models.TaskType.GoalAdjustment,
                AlertCategory.Transaction => Models.TaskType.CashOptimization,
                AlertCategory.Performance => Models.TaskType.Rebalancing,
                AlertCategory.Security => Models.TaskType.InsuranceReview,
                AlertCategory.Tax => Models.TaskType.TaxLossHarvesting,
                AlertCategory.Rebalancing => Models.TaskType.Rebalancing,
                _ => Models.TaskType.CashOptimization
            };
        }

        /// <summary>
        /// Maps alert severity to appropriate task priority
        /// </summary>
        private Models.TaskPriority MapAlertSeverityToTaskPriority(AlertSeverity severity)
        {
            return severity switch
            {
                AlertSeverity.Critical => Models.TaskPriority.High,
                AlertSeverity.High => Models.TaskPriority.High,
                AlertSeverity.Medium => Models.TaskPriority.Medium,
                AlertSeverity.Low => Models.TaskPriority.Low,
                _ => Models.TaskPriority.Medium
            };
        }
    }
}