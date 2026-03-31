using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.Properties;

/// <summary>
/// Orchestrates property valuation: validates address, calls the AVM provider,
/// records history, and updates the property record.
/// </summary>
public interface IPropertyValuationService
{
    /// <summary>
    /// Refresh the valuation for a single property. Returns the new valuation or null.
    /// </summary>
    Task<PropertyValuation?> RefreshValuationAsync(Guid propertyId);

    /// <summary>
    /// Refresh valuations for all eligible properties for a user.
    /// </summary>
    Task<int> RefreshAllPropertyValuationsAsync(int userId);

    /// <summary>
    /// Validate and standardize an address, returning the standardized result.
    /// </summary>
    Task<StandardizedAddress> ValidateAddressAsync(string street, string city, string state, string zip);
}

public class PropertyValuationService : IPropertyValuationService
{
    private readonly ApplicationDbContext _context;
    private readonly IPropertyValuationProvider _valuationProvider;
    private readonly IAddressValidationService _addressService;
    private readonly IPropertyTaskService _taskService;
    private readonly ILogger<PropertyValuationService> _logger;

    public PropertyValuationService(
        ApplicationDbContext context,
        IPropertyValuationProvider valuationProvider,
        IAddressValidationService addressService,
        IPropertyTaskService taskService,
        ILogger<PropertyValuationService> logger)
    {
        _context = context;
        _valuationProvider = valuationProvider;
        _addressService = addressService;
        _taskService = taskService;
        _logger = logger;
    }

    public async Task<StandardizedAddress> ValidateAddressAsync(string street, string city, string state, string zip)
    {
        return await _addressService.ValidateAsync(street, city, state, zip);
    }

    public async Task<PropertyValuation?> RefreshValuationAsync(Guid propertyId)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
        {
            _logger.LogWarning("Property {PropertyId} not found for valuation refresh", propertyId);
            return null;
        }

        if (!HasCompleteAddress(property))
        {
            _logger.LogInformation("Property {PropertyId} ({Name}) has incomplete address — skipping valuation",
                propertyId, property.PropertyName);
            return null;
        }

        var valuation = await _valuationProvider.GetValuationAsync(
            property.Street!, property.City!, property.State!, property.PostalCode!);

        if (valuation == null)
        {
            _logger.LogInformation("No valuation returned for property {PropertyId} ({Name})",
                propertyId, property.PropertyName);
            return null;
        }

        // Update property with valuation data
        property.EstimatedValue = valuation.EstimatedValue;
        property.ValuationSource = valuation.Source;
        property.ValuationConfidence = valuation.ConfidenceScore;
        property.ValuationLow = valuation.LowEstimate;
        property.ValuationHigh = valuation.HighEstimate;
        property.LastValuationAt = valuation.FetchedAt;
        property.UpdatedAt = DateTime.UtcNow;

        // Record in value history
        var historyEntry = new PropertyValueHistory
        {
            PropertyId = propertyId,
            EstimatedValue = valuation.EstimatedValue,
            MortgageBalance = property.MortgageBalance,
            ValueSource = valuation.Source,
            ValueDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _context.PropertyValueHistories.Add(historyEntry);

        await _context.SaveChangesAsync();

        // Mark any stale-property tasks as complete
        await _taskService.RecordPropertyValueUpdateAsync(
            propertyId, valuation.EstimatedValue, valuation.Source,
            $"Auto-valuation: ${valuation.EstimatedValue:N0} (confidence: {valuation.ConfidenceScore:P0})");

        _logger.LogInformation(
            "Refreshed valuation for property {PropertyId} ({Name}): ${Value:N0} [{Low:N0}–{High:N0}] via {Source}",
            propertyId, property.PropertyName, valuation.EstimatedValue,
            valuation.LowEstimate, valuation.HighEstimate, valuation.Source);

        return valuation;
    }

    public async Task<int> RefreshAllPropertyValuationsAsync(int userId)
    {
        var properties = await _context.Properties
            .Where(p => p.UserId == userId && p.AutoValuationEnabled)
            .ToListAsync();

        int refreshed = 0;
        foreach (var property in properties)
        {
            if (!HasCompleteAddress(property))
                continue;

            try
            {
                // Stagger requests to respect rate limits
                if (refreshed > 0)
                    await Task.Delay(1500);

                var result = await RefreshValuationAsync(property.PropertyId);
                if (result != null)
                    refreshed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh valuation for property {PropertyId}", property.PropertyId);
            }
        }

        _logger.LogInformation("Refreshed {Count}/{Total} property valuations for user {UserId}",
            refreshed, properties.Count, userId);
        return refreshed;
    }

    private static bool HasCompleteAddress(PropertyProfile p)
    {
        return !string.IsNullOrWhiteSpace(p.Street)
            && !string.IsNullOrWhiteSpace(p.City)
            && !string.IsNullOrWhiteSpace(p.State)
            && !string.IsNullOrWhiteSpace(p.PostalCode);
    }
}
