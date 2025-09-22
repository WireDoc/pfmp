using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TasksController> _logger;

        public TasksController(ApplicationDbContext context, ILogger<TasksController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Gets all tasks for a specific user with optional filtering
        /// </summary>
        /// <param name="userId">User ID to filter tasks</param>
        /// <param name="status">Optional status filter</param>
        /// <param name="type">Optional type filter</param>
        /// <param name="priority">Optional priority filter</param>
        /// <returns>List of tasks</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserTask>>> GetTasks(
            [FromQuery] int userId,
            [FromQuery] Models.TaskStatus? status = null,
            [FromQuery] Models.TaskType? type = null,
            [FromQuery] Models.TaskPriority? priority = null)
        {
            try
            {
                var query = _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .Where(t => t.UserId == userId);

                if (status.HasValue)
                    query = query.Where(t => t.Status == status.Value);

                if (type.HasValue)
                    query = query.Where(t => t.Type == type.Value);

                if (priority.HasValue)
                    query = query.Where(t => t.Priority == priority.Value);

                var tasks = await query
                    .OrderBy(t => t.Priority)
                    .ThenBy(t => t.DueDate)
                    .ThenByDescending(t => t.CreatedDate)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} tasks for user {UserId}", tasks.Count, userId);
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving tasks");
            }
        }

        /// <summary>
        /// Gets a specific task by ID
        /// </summary>
        /// <param name="id">Task ID</param>
        /// <returns>Task details</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<UserTask>> GetTask(int id)
        {
            try
            {
                var task = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == id);

                if (task == null)
                {
                    _logger.LogWarning("Task with ID {TaskId} not found", id);
                    return NotFound($"Task with ID {id} not found");
                }

                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task {TaskId}", id);
                return StatusCode(500, "An error occurred while retrieving the task");
            }
        }

        /// <summary>
        /// Creates a new task
        /// </summary>
        /// <param name="task">Task to create</param>
        /// <returns>Created task</returns>
        [HttpPost]
        public async Task<ActionResult<UserTask>> CreateTask(UserTask task)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verify user exists
                var userExists = await _context.Users.AnyAsync(u => u.UserId == task.UserId);
                if (!userExists)
                {
                    return BadRequest($"User with ID {task.UserId} does not exist");
                }

                // Verify source alert exists if provided
                if (task.SourceAlertId.HasValue)
                {
                    var alertExists = await _context.Alerts.AnyAsync(a => a.AlertId == task.SourceAlertId.Value);
                    if (!alertExists)
                    {
                        return BadRequest($"Alert with ID {task.SourceAlertId.Value} does not exist");
                    }
                }

                task.CreatedDate = DateTime.UtcNow;
                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();

                // Return the task with navigation properties loaded
                var createdTask = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == task.TaskId);

                _logger.LogInformation("Created new task {TaskId} for user {UserId}: {Title}", 
                    task.TaskId, task.UserId, task.Title);

                return CreatedAtAction(nameof(GetTask), new { id = task.TaskId }, createdTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task for user {UserId}", task.UserId);
                return StatusCode(500, "An error occurred while creating the task");
            }
        }

        /// <summary>
        /// Updates an existing task
        /// </summary>
        /// <param name="id">Task ID</param>
        /// <param name="task">Updated task data</param>
        /// <returns>Updated task</returns>
        [HttpPut("{id}")]
        public async Task<ActionResult<UserTask>> UpdateTask(int id, UserTask task)
        {
            try
            {
                if (id != task.TaskId)
                {
                    return BadRequest("Task ID in URL does not match task ID in body");
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existingTask = await _context.Tasks.FindAsync(id);
                if (existingTask == null)
                {
                    return NotFound($"Task with ID {id} not found");
                }

                // Update properties
                existingTask.Type = task.Type;
                existingTask.Title = task.Title;
                existingTask.Description = task.Description;
                existingTask.Priority = task.Priority;
                existingTask.Status = task.Status;
                existingTask.DueDate = task.DueDate;
                existingTask.Notes = task.Notes;
                existingTask.CompletionNotes = task.CompletionNotes;
                existingTask.EstimatedImpact = task.EstimatedImpact;
                existingTask.ImpactDescription = task.ImpactDescription;
                existingTask.ProgressPercentage = task.ProgressPercentage;
                existingTask.ConfidenceScore = task.ConfidenceScore;

                await _context.SaveChangesAsync();

                // Return the updated task with navigation properties
                var updatedTask = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == id);

                _logger.LogInformation("Updated task {TaskId}: {Title}", id, task.Title);
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task {TaskId}", id);
                return StatusCode(500, "An error occurred while updating the task");
            }
        }

        /// <summary>
        /// Marks a task as completed
        /// </summary>
        /// <param name="id">Task ID</param>
        /// <param name="completionNotes">Optional completion notes</param>
        /// <returns>Updated task</returns>
        [HttpPatch("{id}/complete")]
        public async Task<ActionResult<UserTask>> MarkAsCompleted(int id, [FromBody] string? completionNotes = null)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound($"Task with ID {id} not found");
                }

                task.Status = Models.TaskStatus.Completed;
                task.CompletedDate = DateTime.UtcNow;
                task.ProgressPercentage = 100;
                if (!string.IsNullOrEmpty(completionNotes))
                {
                    task.CompletionNotes = completionNotes;
                }

                await _context.SaveChangesAsync();

                // Return the updated task with navigation properties
                var completedTask = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == id);

                _logger.LogInformation("Marked task {TaskId} as completed: {Title}", id, task.Title);
                return Ok(completedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking task {TaskId} as completed", id);
                return StatusCode(500, "An error occurred while completing the task");
            }
        }

        /// <summary>
        /// Dismisses a task without deleting it
        /// </summary>
        /// <param name="id">Task ID</param>
        /// <param name="dismissalNotes">Optional dismissal notes</param>
        /// <returns>Updated task</returns>
        [HttpPatch("{id}/dismiss")]
        public async Task<ActionResult<UserTask>> DismissTask(int id, [FromBody] string? dismissalNotes = null)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound($"Task with ID {id} not found");
                }

                task.Status = Models.TaskStatus.Dismissed;
                task.DismissedDate = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(dismissalNotes))
                {
                    task.CompletionNotes = dismissalNotes;
                }

                await _context.SaveChangesAsync();

                // Return the updated task with navigation properties
                var dismissedTask = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == id);

                _logger.LogInformation("Dismissed task {TaskId}: {Title}", id, task.Title);
                return Ok(dismissedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dismissing task {TaskId}", id);
                return StatusCode(500, "An error occurred while dismissing the task");
            }
        }

        /// <summary>
        /// Updates task progress percentage
        /// </summary>
        /// <param name="id">Task ID</param>
        /// <param name="progressPercentage">Progress percentage (0-100)</param>
        /// <returns>Updated task</returns>
        [HttpPatch("{id}/progress")]
        public async Task<ActionResult<UserTask>> UpdateProgress(int id, [FromBody] int progressPercentage)
        {
            try
            {
                if (progressPercentage < 0 || progressPercentage > 100)
                {
                    return BadRequest("Progress percentage must be between 0 and 100");
                }

                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound($"Task with ID {id} not found");
                }

                task.ProgressPercentage = progressPercentage;
                
                // Auto-update status based on progress
                if (progressPercentage == 0 && task.Status == Models.TaskStatus.InProgress)
                {
                    task.Status = Models.TaskStatus.Accepted;
                }
                else if (progressPercentage > 0 && progressPercentage < 100 && task.Status != Models.TaskStatus.InProgress)
                {
                    task.Status = Models.TaskStatus.InProgress;
                }
                else if (progressPercentage == 100)
                {
                    task.Status = Models.TaskStatus.Completed;
                    task.CompletedDate = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                // Return the updated task with navigation properties
                var updatedTask = await _context.Tasks
                    .Include(t => t.User)
                    .Include(t => t.SourceAlert)
                    .FirstOrDefaultAsync(t => t.TaskId == id);

                _logger.LogInformation("Updated progress for task {TaskId} to {Progress}%", id, progressPercentage);
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating progress for task {TaskId}", id);
                return StatusCode(500, "An error occurred while updating task progress");
            }
        }

        /// <summary>
        /// Gets task analytics for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Task completion statistics</returns>
        [HttpGet("analytics/{userId}")]
        public async Task<ActionResult> GetTaskAnalytics(int userId)
        {
            try
            {
                var tasks = await _context.Tasks
                    .Where(t => t.UserId == userId)
                    .ToListAsync();

                var analytics = new
                {
                    TotalTasks = tasks.Count,
                    CompletedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Completed),
                    DismissedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Dismissed),
                    InProgressTasks = tasks.Count(t => t.Status == Models.TaskStatus.InProgress),
                    PendingTasks = tasks.Count(t => t.Status == Models.TaskStatus.Pending),
                    AcceptedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Accepted),
                    CompletionRate = tasks.Count > 0 ? 
                        (double)tasks.Count(t => t.Status == Models.TaskStatus.Completed) / tasks.Count * 100 : 0,
                    AverageCompletionTime = tasks
                        .Where(t => t.Status == Models.TaskStatus.Completed && t.CompletedDate.HasValue)
                        .Select(t => (t.CompletedDate!.Value - t.CreatedDate).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average(),
                    TasksByType = tasks.GroupBy(t => t.Type)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                    TasksByPriority = tasks.GroupBy(t => t.Priority)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count())
                };

                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task analytics for user {UserId}", userId);
                return StatusCode(500, "An error occurred while retrieving task analytics");
            }
        }
    }
}