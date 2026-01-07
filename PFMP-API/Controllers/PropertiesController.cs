using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Services;

namespace PFMP_API.Controllers;

/// <summary>
/// API endpoints for managing real estate properties.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PropertiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PropertiesController> _logger;
    private readonly IPropertyTaskService _propertyTaskService;

    public PropertiesController(
        ApplicationDbContext context,
        ILogger<PropertiesController> logger,
        IPropertyTaskService propertyTaskService)
    {
        _context = context;
        _logger = logger;
        _propertyTaskService = propertyTaskService;
    }

    /// <summary>
    /// Get all properties for a user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PropertyDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PropertyDto>>> GetProperties([FromQuery] int userId)
    {
        if (userId <= 0)
            return BadRequest("Valid userId is required");

        var properties = await _context.Properties
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.EstimatedValue)
            .ToListAsync();

        var dtos = properties.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Get a specific property by ID.
    /// </summary>
    [HttpGet("{propertyId}")]
    [ProducesResponseType(typeof(PropertyDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PropertyDetailDto>> GetProperty(Guid propertyId)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
            return NotFound($"Property {propertyId} not found");

        // Get value history
        var history = await _context.PropertyValueHistories
            .Where(h => h.PropertyId == propertyId)
            .OrderByDescending(h => h.ValueDate)
            .Take(12) // Last 12 entries
            .ToListAsync();

        // Get linked mortgage if any
        LiabilityAccount? mortgage = null;
        if (property.LinkedMortgageLiabilityId.HasValue)
        {
            mortgage = await _context.LiabilityAccounts
                .FirstOrDefaultAsync(l => l.LiabilityAccountId == property.LinkedMortgageLiabilityId.Value);
        }

        var dto = MapToDetailDto(property, history, mortgage);
        return Ok(dto);
    }

    /// <summary>
    /// Create a new property.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PropertyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PropertyDto>> CreateProperty([FromBody] CreatePropertyRequest request)
    {
        if (request.UserId <= 0)
            return BadRequest("Valid userId is required");

        var property = new PropertyProfile
        {
            UserId = request.UserId,
            PropertyName = request.PropertyName,
            PropertyType = request.PropertyType ?? "primary",
            Occupancy = request.Occupancy ?? "owner",
            EstimatedValue = request.EstimatedValue,
            MortgageBalance = request.MortgageBalance,
            MonthlyMortgagePayment = request.MonthlyMortgagePayment,
            MonthlyRentalIncome = request.MonthlyRentalIncome,
            MonthlyExpenses = request.MonthlyExpenses,
            HasHeloc = request.HasHeloc,
            Street = request.Street,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Properties.Add(property);

        // Record initial value in history
        var historyEntry = new PropertyValueHistory
        {
            PropertyId = property.PropertyId,
            EstimatedValue = request.EstimatedValue,
            MortgageBalance = request.MortgageBalance,
            ValueSource = "manual",
            ValueDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _context.PropertyValueHistories.Add(historyEntry);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Created property {PropertyId} for user {UserId}", property.PropertyId, request.UserId);
        return CreatedAtAction(nameof(GetProperty), new { propertyId = property.PropertyId }, MapToDto(property));
    }

    /// <summary>
    /// Update an existing property.
    /// </summary>
    [HttpPut("{propertyId}")]
    [ProducesResponseType(typeof(PropertyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PropertyDto>> UpdateProperty(Guid propertyId, [FromBody] UpdatePropertyRequest request)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
            return NotFound($"Property {propertyId} not found");

        // Track if value changed for history
        var valueChanged = request.EstimatedValue.HasValue && request.EstimatedValue != property.EstimatedValue;
        var oldValue = property.EstimatedValue;

        // Update fields
        if (!string.IsNullOrEmpty(request.PropertyName))
            property.PropertyName = request.PropertyName;
        if (!string.IsNullOrEmpty(request.PropertyType))
            property.PropertyType = request.PropertyType;
        if (!string.IsNullOrEmpty(request.Occupancy))
            property.Occupancy = request.Occupancy;
        if (request.EstimatedValue.HasValue)
            property.EstimatedValue = request.EstimatedValue.Value;
        if (request.MortgageBalance.HasValue)
            property.MortgageBalance = request.MortgageBalance.Value;
        if (request.MonthlyMortgagePayment.HasValue)
            property.MonthlyMortgagePayment = request.MonthlyMortgagePayment.Value;
        if (request.MonthlyRentalIncome.HasValue)
            property.MonthlyRentalIncome = request.MonthlyRentalIncome.Value;
        if (request.MonthlyExpenses.HasValue)
            property.MonthlyExpenses = request.MonthlyExpenses.Value;
        if (request.HasHeloc.HasValue)
            property.HasHeloc = request.HasHeloc.Value;
        if (!string.IsNullOrEmpty(request.Street))
            property.Street = request.Street;
        if (!string.IsNullOrEmpty(request.City))
            property.City = request.City;
        if (!string.IsNullOrEmpty(request.State))
            property.State = request.State;
        if (!string.IsNullOrEmpty(request.PostalCode))
            property.PostalCode = request.PostalCode;

        property.UpdatedAt = DateTime.UtcNow;

        // Record value change in history
        if (valueChanged)
        {
            await _propertyTaskService.RecordPropertyValueUpdateAsync(
                propertyId, 
                property.EstimatedValue, 
                "manual",
                $"Updated from ${oldValue:N0} to ${property.EstimatedValue:N0}");
        }
        else
        {
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("Updated property {PropertyId}", propertyId);
        return Ok(MapToDto(property));
    }

    /// <summary>
    /// Delete a property.
    /// </summary>
    [HttpDelete("{propertyId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProperty(Guid propertyId)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
            return NotFound($"Property {propertyId} not found");

        // Check if Plaid-synced
        if (property.Source == Models.Plaid.AccountSource.PlaidMortgage)
        {
            return BadRequest("Cannot delete a Plaid-synced property. Unlink the mortgage first.");
        }

        // Delete history
        var history = await _context.PropertyValueHistories
            .Where(h => h.PropertyId == propertyId)
            .ToListAsync();
        _context.PropertyValueHistories.RemoveRange(history);

        _context.Properties.Remove(property);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted property {PropertyId}", propertyId);
        return NoContent();
    }

    /// <summary>
    /// Get property value history.
    /// </summary>
    [HttpGet("{propertyId}/history")]
    [ProducesResponseType(typeof(List<PropertyValueHistoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PropertyValueHistoryDto>>> GetPropertyHistory(Guid propertyId, [FromQuery] int? limit = 24)
    {
        var history = await _context.PropertyValueHistories
            .Where(h => h.PropertyId == propertyId)
            .OrderByDescending(h => h.ValueDate)
            .Take(limit ?? 24)
            .Select(h => new PropertyValueHistoryDto
            {
                HistoryId = h.PropertyValueHistoryId,
                PropertyId = h.PropertyId,
                EstimatedValue = h.EstimatedValue,
                MortgageBalance = h.MortgageBalance,
                Equity = h.EstimatedValue - (h.MortgageBalance ?? 0),
                Source = h.ValueSource,
                RecordedAt = h.ValueDate
            })
            .ToListAsync();

        return Ok(history);
    }

    /// <summary>
    /// Generate property value update tasks for stale properties.
    /// </summary>
    [HttpPost("tasks/generate")]
    [ProducesResponseType(typeof(List<UserTask>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<UserTask>>> GeneratePropertyTasks(
        [FromQuery] int userId,
        [FromQuery] int monthsThreshold = 3)
    {
        if (userId <= 0)
            return BadRequest("Valid userId is required");

        var tasks = await _propertyTaskService.GeneratePropertyValueUpdateTasksAsync(userId, monthsThreshold);
        return Ok(tasks);
    }

    #region Mapping

    private static PropertyDto MapToDto(PropertyProfile p) => new()
    {
        PropertyId = p.PropertyId,
        PropertyName = p.PropertyName,
        PropertyType = p.PropertyType,
        Occupancy = p.Occupancy,
        EstimatedValue = p.EstimatedValue,
        MortgageBalance = p.MortgageBalance,
        Equity = p.EstimatedValue - (p.MortgageBalance ?? 0),
        MonthlyMortgagePayment = p.MonthlyMortgagePayment,
        MonthlyRentalIncome = p.MonthlyRentalIncome,
        MonthlyExpenses = p.MonthlyExpenses,
        MonthlyCashFlow = (p.MonthlyRentalIncome ?? 0) - (p.MonthlyMortgagePayment ?? 0) - (p.MonthlyExpenses ?? 0),
        HasHeloc = p.HasHeloc,
        Address = FormatAddress(p),
        Source = p.Source.ToString(),
        IsPlaidLinked = p.LinkedMortgageLiabilityId.HasValue,
        LastSyncedAt = p.LastSyncedAt,
        UpdatedAt = p.UpdatedAt
    };

    private static PropertyDetailDto MapToDetailDto(
        PropertyProfile p, 
        List<PropertyValueHistory> history,
        LiabilityAccount? mortgage) => new()
    {
        PropertyId = p.PropertyId,
        PropertyName = p.PropertyName,
        PropertyType = p.PropertyType,
        Occupancy = p.Occupancy,
        EstimatedValue = p.EstimatedValue,
        MortgageBalance = p.MortgageBalance,
        Equity = p.EstimatedValue - (p.MortgageBalance ?? 0),
        MonthlyMortgagePayment = p.MonthlyMortgagePayment,
        MonthlyRentalIncome = p.MonthlyRentalIncome,
        MonthlyExpenses = p.MonthlyExpenses,
        MonthlyCashFlow = (p.MonthlyRentalIncome ?? 0) - (p.MonthlyMortgagePayment ?? 0) - (p.MonthlyExpenses ?? 0),
        HasHeloc = p.HasHeloc,
        Street = p.Street,
        City = p.City,
        State = p.State,
        PostalCode = p.PostalCode,
        Address = FormatAddress(p),
        Source = p.Source.ToString(),
        IsPlaidLinked = p.LinkedMortgageLiabilityId.HasValue,
        LinkedMortgageLiabilityId = p.LinkedMortgageLiabilityId,
        LastSyncedAt = p.LastSyncedAt,
        SyncStatus = p.SyncStatus,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        LinkedMortgage = mortgage != null ? new MortgageSummaryDto
        {
            LiabilityAccountId = mortgage.LiabilityAccountId,
            Lender = mortgage.Lender,
            CurrentBalance = mortgage.CurrentBalance,
            InterestRate = mortgage.InterestRateApr,
            MinimumPayment = mortgage.MinimumPayment,
            NextPaymentDueDate = mortgage.NextPaymentDueDate
        } : null,
        ValueHistory = history.Select(h => new PropertyValueHistoryDto
        {
            HistoryId = h.PropertyValueHistoryId,
            PropertyId = h.PropertyId,
            EstimatedValue = h.EstimatedValue,
            MortgageBalance = h.MortgageBalance,
            Equity = h.EstimatedValue - (h.MortgageBalance ?? 0),
            Source = h.ValueSource,
            RecordedAt = h.ValueDate
        }).ToList()
    };

    private static string? FormatAddress(PropertyProfile p)
    {
        var parts = new[] { p.Street, p.City, p.State, p.PostalCode }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        return parts.Any() ? string.Join(", ", parts) : null;
    }

    #endregion
}

#region DTOs

public class PropertyDto
{
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public string Occupancy { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public decimal? MortgageBalance { get; set; }
    public decimal Equity { get; set; }
    public decimal? MonthlyMortgagePayment { get; set; }
    public decimal? MonthlyRentalIncome { get; set; }
    public decimal? MonthlyExpenses { get; set; }
    public decimal MonthlyCashFlow { get; set; }
    public bool HasHeloc { get; set; }
    public string? Address { get; set; }
    public string Source { get; set; } = string.Empty;
    public bool IsPlaidLinked { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PropertyDetailDto : PropertyDto
{
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public int? LinkedMortgageLiabilityId { get; set; }
    public string? SyncStatus { get; set; }
    public DateTime CreatedAt { get; set; }
    public MortgageSummaryDto? LinkedMortgage { get; set; }
    public List<PropertyValueHistoryDto> ValueHistory { get; set; } = [];
}

public class MortgageSummaryDto
{
    public int LiabilityAccountId { get; set; }
    public string? Lender { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal? InterestRate { get; set; }
    public decimal? MinimumPayment { get; set; }
    public DateTime? NextPaymentDueDate { get; set; }
}

public class PropertyValueHistoryDto
{
    public int HistoryId { get; set; }
    public Guid PropertyId { get; set; }
    public decimal EstimatedValue { get; set; }
    public decimal? MortgageBalance { get; set; }
    public decimal Equity { get; set; }
    public string? Source { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class CreatePropertyRequest
{
    public int UserId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string? PropertyType { get; set; }
    public string? Occupancy { get; set; }
    public decimal EstimatedValue { get; set; }
    public decimal? MortgageBalance { get; set; }
    public decimal? MonthlyMortgagePayment { get; set; }
    public decimal? MonthlyRentalIncome { get; set; }
    public decimal? MonthlyExpenses { get; set; }
    public bool HasHeloc { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
}

public class UpdatePropertyRequest
{
    public string? PropertyName { get; set; }
    public string? PropertyType { get; set; }
    public string? Occupancy { get; set; }
    public decimal? EstimatedValue { get; set; }
    public decimal? MortgageBalance { get; set; }
    public decimal? MonthlyMortgagePayment { get; set; }
    public decimal? MonthlyRentalIncome { get; set; }
    public decimal? MonthlyExpenses { get; set; }
    public bool? HasHeloc { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
}

#endregion
