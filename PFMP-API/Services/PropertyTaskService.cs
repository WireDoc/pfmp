using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services;

/// <summary>
/// Service for generating property-related tasks (value updates, etc.).
/// </summary>
public interface IPropertyTaskService
{
    /// <summary>
    /// Generates property value update tasks for properties that haven't been updated recently.
    /// </summary>
    Task<List<UserTask>> GeneratePropertyValueUpdateTasksAsync(int userId, int monthsThreshold = 3);

    /// <summary>
    /// Records a property value update and marks related task as complete.
    /// </summary>
    Task RecordPropertyValueUpdateAsync(Guid propertyId, decimal newValue, string source = "manual", string? notes = null);
}

public class PropertyTaskService : IPropertyTaskService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PropertyTaskService> _logger;

    public PropertyTaskService(
        ApplicationDbContext context,
        ILogger<PropertyTaskService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<List<UserTask>> GeneratePropertyValueUpdateTasksAsync(int userId, int monthsThreshold = 3)
    {
        var tasks = new List<UserTask>();
        var cutoffDate = DateTime.UtcNow.AddMonths(-monthsThreshold);

        // Find properties that haven't been updated recently
        var propertiesNeedingUpdate = await _context.Properties
            .Where(p => p.UserId == userId)
            .Where(p => p.UpdatedAt < cutoffDate)
            .ToListAsync();

        foreach (var property in propertiesNeedingUpdate)
        {
            var task = await CreateOrGetExistingTaskAsync(userId, property);
            if (task != null)
            {
                tasks.Add(task);
            }
        }

        _logger.LogInformation(
            "Generated {Count} property value update tasks for user {UserId}",
            tasks.Count, userId);

        return tasks;
    }

    /// <inheritdoc />
    public async Task RecordPropertyValueUpdateAsync(
        Guid propertyId, 
        decimal newValue, 
        string source = "manual", 
        string? notes = null)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
        {
            throw new ArgumentException($"Property {propertyId} not found");
        }

        // Record in history
        var historyEntry = new PropertyValueHistory
        {
            PropertyId = propertyId,
            EstimatedValue = newValue,
            MortgageBalance = property.MortgageBalance,
            ValueSource = source,
            ValueDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _context.PropertyValueHistories.Add(historyEntry);

        // Update property
        property.EstimatedValue = newValue;
        property.UpdatedAt = DateTime.UtcNow;

        // Mark any pending tasks as complete
        var pendingTasks = await _context.Tasks
            .Where(t => t.UserId == property.UserId 
                && t.Type == TaskType.PropertyValueUpdate
                && t.Status == Models.TaskStatus.Pending
                && t.Notes != null && t.Notes.Contains(propertyId.ToString()))
            .ToListAsync();

        foreach (var task in pendingTasks)
        {
            task.Status = Models.TaskStatus.Completed;
            task.CompletedDate = DateTime.UtcNow;
            task.CompletionNotes = $"Updated to ${newValue:N0} ({source})";
            task.ProgressPercentage = 100;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Recorded property value update for {PropertyId}: ${Value} ({Source})",
            propertyId, newValue, source);
    }

    private async Task<UserTask?> CreateOrGetExistingTaskAsync(int userId, PropertyProfile property)
    {
        // Check for existing pending task for this property
        var existingTask = await _context.Tasks
            .Where(t => t.UserId == userId 
                && t.Type == TaskType.PropertyValueUpdate
                && t.Status == Models.TaskStatus.Pending
                && t.Notes != null && t.Notes.Contains(property.PropertyId.ToString()))
            .FirstOrDefaultAsync();

        if (existingTask != null)
        {
            return null; // Already has a pending task
        }

        var monthsSinceUpdate = (DateTime.UtcNow - property.UpdatedAt).Days / 30;
        var priority = monthsSinceUpdate >= 6 ? TaskPriority.High : 
                       monthsSinceUpdate >= 3 ? TaskPriority.Medium : TaskPriority.Low;

        var task = new UserTask
        {
            UserId = userId,
            Type = TaskType.PropertyValueUpdate,
            Title = $"Update property value for {property.PropertyName}",
            Description = $"The estimated value for '{property.PropertyName}' was last updated {monthsSinceUpdate} months ago. " +
                         $"Consider updating the value to ensure accurate net worth tracking. " +
                         $"Current value: ${property.EstimatedValue:N0}",
            Priority = priority,
            Status = Models.TaskStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14), // Give 2 weeks to update
            SourceType = "PropertyMonitor",
            Notes = $"PropertyId:{property.PropertyId}|LastUpdated:{property.UpdatedAt:yyyy-MM-dd}",
            EstimatedImpact = null, // No direct financial impact
            ImpactDescription = "Keeping property values current improves net worth accuracy",
            ConfidenceScore = 1.0m // System-generated, 100% confidence
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return task;
    }
}
