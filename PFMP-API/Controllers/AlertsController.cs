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
        private readonly ICreditAlertService _creditAlertService;

        public AlertsController(
            ApplicationDbContext context, 
            ILogger<AlertsController> logger, 
            IAIService aiService,
            ICreditAlertService creditAlertService)
        {
            _context = context;
            _logger = logger;
            _aiService = aiService;
            _creditAlertService = creditAlertService;
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

                // Legacy task generation removed (alerts no longer spawn tasks directly).

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
        /// Generates credit-related alerts for a user (high utilization, payment due dates).
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of generated/updated alerts</returns>
        [HttpPost("credit/generate")]
        [ProducesResponseType(typeof(List<Alert>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<List<Alert>>> GenerateCreditAlerts([FromQuery] int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Valid userId is required");
                }

                var alerts = await _creditAlertService.GenerateCreditAlertsAsync(userId);
                return Ok(alerts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating credit alerts for user {UserId}", userId);
                return StatusCode(500, "An error occurred while generating credit alerts");
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
                    // Legacy metric removed (alerts no longer generate tasks directly)
                    TaskGeneratedAlerts = 0,
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
        public ActionResult GenerateTaskFromAlert(int alertId) => StatusCode(410, new { message = "Deprecated. Alerts no longer generate tasks directly. Use /api/Alerts/{id}/generate-advice then accept the advice." });

        /// <summary>
        /// Generates an Advice record derived from an alert (manual trigger; no auto task creation).
        /// </summary>
        [HttpPost("{alertId}/generate-advice")]
        public async Task<ActionResult<Advice>> GenerateAdviceFromAlert(int alertId, [FromServices] IAdviceService adviceService, [FromQuery] bool includeSnapshot = true)
        {
            try
            {
                // Find alert to extract user context
                var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.AlertId == alertId);
                if (alert == null)
                {
                    return NotFound($"Alert with ID {alertId} not found");
                }

                var advice = await adviceService.GenerateAdviceFromAlertAsync(alertId, alert.UserId, includeSnapshot);
                return Ok(advice);
            }
            catch (ArgumentException ae)
            {
                _logger.LogWarning(ae, "Validation error generating advice from alert {AlertId}", alertId);
                return BadRequest(ae.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating advice from alert {AlertId}", alertId);
                return StatusCode(500, "Failed to generate advice from alert");
            }
        }

        /// <summary>
        /// Private method to generate a task from an alert
        /// </summary>
        // Legacy mapping helpers removed with task generation deprecation.
    }
}