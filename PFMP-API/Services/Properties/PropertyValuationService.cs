using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.Properties;

/// <summary>
/// Orchestrates property valuation: validates address, resolves the active
/// provider for the property, records history, and updates the property record.
/// </summary>
public interface IPropertyValuationService
{
    /// <summary>Whether at least one valuation provider is configured.</summary>
    bool IsValuationConfigured { get; }

    /// <summary>Whether the address validation service has its API credentials configured.</summary>
    bool IsAddressValidationConfigured { get; }

    /// <summary>
    /// Refresh the valuation for a single property using its active provider
    /// (per-property override → global default). Returns null when the property
    /// is set to "manual", has an incomplete address, or the provider can't value it.
    /// </summary>
    Task<PropertyValuation?> RefreshValuationAsync(Guid propertyId);

    /// <summary>
    /// Refresh valuations for all eligible properties for a user.
    /// </summary>
    Task<int> RefreshAllPropertyValuationsAsync(int userId);

    /// <summary>
    /// Fetch an estimate from EVERY configured provider for side-by-side
    /// comparison. Nothing is persisted — display-only. Providers that can't
    /// value the property (e.g. FHFA without an anchor) return an error note.
    /// </summary>
    Task<IReadOnlyList<ProviderEstimate>> GetAllEstimatesAsync(Guid propertyId);

    /// <summary>
    /// Validate and standardize an address, returning the standardized result.
    /// </summary>
    Task<StandardizedAddress> ValidateAddressAsync(string street, string city, string state, string zip);
}

/// <summary>One provider's answer in the compare view.</summary>
public record ProviderEstimate(
    string Provider,
    bool IsActive,
    decimal? EstimatedValue,
    decimal? LowEstimate,
    decimal? HighEstimate,
    decimal? Confidence,
    string? Note);

public class PropertyValuationService : IPropertyValuationService
{
    /// <summary>Sentinel provider name meaning "user-entered value; never auto-refresh".</summary>
    public const string ManualProvider = "manual";

    private readonly ApplicationDbContext _context;
    private readonly IReadOnlyList<IPropertyValuationProvider> _providers;
    private readonly IAddressValidationService _addressService;
    private readonly IPropertyTaskService _taskService;
    private readonly ILogger<PropertyValuationService> _logger;
    private readonly string _defaultProviderName;

    public PropertyValuationService(
        ApplicationDbContext context,
        IEnumerable<IPropertyValuationProvider> providers,
        IAddressValidationService addressService,
        IPropertyTaskService taskService,
        IConfiguration configuration,
        ILogger<PropertyValuationService> logger)
    {
        _context = context;
        _providers = providers.ToList();
        _addressService = addressService;
        _taskService = taskService;
        _logger = logger;
        _defaultProviderName = configuration["PropertyValuation:DefaultProvider"] ?? "rentcast";
    }

    public bool IsValuationConfigured => _providers.Any(p => p.IsConfigured);
    public bool IsAddressValidationConfigured => _addressService.IsConfigured;

    public async Task<StandardizedAddress> ValidateAddressAsync(string street, string city, string state, string zip)
    {
        return await _addressService.ValidateAsync(street, city, state, zip);
    }

    /// <summary>
    /// The provider that drives this property's stored value (and therefore its
    /// net-worth contribution): per-property override first, global default
    /// otherwise. Returns null for "manual" (no auto-refresh).
    /// </summary>
    private IPropertyValuationProvider? ResolveActiveProvider(PropertyProfile property, out string resolvedName)
    {
        var name = string.IsNullOrWhiteSpace(property.PreferredValuationProvider)
            ? _defaultProviderName
            : property.PreferredValuationProvider!;
        resolvedName = name;

        if (string.Equals(name, ManualProvider, StringComparison.OrdinalIgnoreCase))
            return null;

        var provider = _providers.FirstOrDefault(p =>
            string.Equals(p.ProviderName, name, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            _logger.LogWarning(
                "Property {PropertyId} wants provider '{Provider}' but it isn't registered — falling back to default '{Default}'",
                property.PropertyId, resolvedName, _defaultProviderName);
            provider = _providers.FirstOrDefault(p =>
                string.Equals(p.ProviderName, _defaultProviderName, StringComparison.OrdinalIgnoreCase));
        }

        return provider;
    }

    private static PropertyValuationRequest BuildRequest(PropertyProfile p, string street, string city, string state, string zip) =>
        new(street, city, state, zip, p.ValuationAnchorValue, p.ValuationAnchorDate);

    public async Task<PropertyValuation?> RefreshValuationAsync(Guid propertyId)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null)
        {
            _logger.LogWarning("Property {PropertyId} not found for valuation refresh", propertyId);
            return null;
        }

        var provider = ResolveActiveProvider(property, out var providerName);
        if (provider == null)
        {
            _logger.LogInformation(
                "Property {PropertyId} ({Name}) uses provider '{Provider}' — no auto-refresh",
                propertyId, property.PropertyName, providerName);
            return null;
        }

        if (!HasCompleteAddress(property))
        {
            _logger.LogInformation("Property {PropertyId} ({Name}) has incomplete address — skipping valuation",
                propertyId, property.PropertyName);
            return null;
        }

        // Standardize address via USPS before calling valuation provider
        // This handles city name mismatches (e.g., Centerton → Bentonville for USPS ZIP)
        var street = property.Street!;
        var city = property.City!;
        var state = property.State!;
        var zip = property.PostalCode!;

        if (_addressService.IsConfigured && !property.AddressValidated)
        {
            var standardized = await _addressService.ValidateAsync(street, city, state, zip);
            if (standardized.IsValid && standardized.WasStandardized)
            {
                street = standardized.Street;
                city = standardized.City;
                state = standardized.State;
                zip = standardized.Zip5;

                // Persist the standardized address
                property.Street = street;
                property.City = city;
                property.State = state;
                property.PostalCode = zip;
                property.AddressValidated = true;

                _logger.LogInformation(
                    "Standardized address for property {PropertyId}: {Street}, {City}, {State} {Zip}",
                    propertyId, street, city, state, zip);
            }
        }

        var valuation = await provider.GetValuationAsync(BuildRequest(property, street, city, state, zip));

        if (valuation == null)
        {
            _logger.LogInformation("No valuation returned for property {PropertyId} ({Name}) via {Provider}",
                propertyId, property.PropertyName, provider.ProviderName);
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
            // Manual-provider properties never auto-refresh.
            if (ResolveActiveProvider(property, out _) == null)
                continue;

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

    public async Task<IReadOnlyList<ProviderEstimate>> GetAllEstimatesAsync(Guid propertyId)
    {
        var property = await _context.Properties.FindAsync(propertyId);
        if (property == null) return Array.Empty<ProviderEstimate>();

        ResolveActiveProvider(property, out var activeName);

        var results = new List<ProviderEstimate>();
        var hasAddress = HasCompleteAddress(property);

        foreach (var provider in _providers)
        {
            var isActive = string.Equals(provider.ProviderName, activeName, StringComparison.OrdinalIgnoreCase);

            if (!provider.IsConfigured)
            {
                results.Add(new ProviderEstimate(provider.ProviderName, isActive, null, null, null, null,
                    "Provider not configured"));
                continue;
            }
            if (!hasAddress)
            {
                results.Add(new ProviderEstimate(provider.ProviderName, isActive, null, null, null, null,
                    "Property address incomplete"));
                continue;
            }

            try
            {
                var v = await provider.GetValuationAsync(
                    BuildRequest(property, property.Street!, property.City!, property.State!, property.PostalCode!));
                results.Add(v == null
                    ? new ProviderEstimate(provider.ProviderName, isActive, null, null, null, null,
                        provider.ProviderName == "fhfa-hpi" && property.ValuationAnchorValue == null
                            ? "Set an anchor value + date to enable the FHFA index estimate"
                            : "No estimate available")
                    : new ProviderEstimate(provider.ProviderName, isActive,
                        v.EstimatedValue, v.LowEstimate, v.HighEstimate, v.ConfidenceScore, null));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Provider {Provider} failed during compare for {PropertyId}",
                    provider.ProviderName, propertyId);
                results.Add(new ProviderEstimate(provider.ProviderName, isActive, null, null, null, null,
                    "Lookup failed"));
            }
        }

        // The "manual" pseudo-provider always appears so the picker can offer it.
        results.Add(new ProviderEstimate(ManualProvider,
            string.Equals(activeName, ManualProvider, StringComparison.OrdinalIgnoreCase),
            null, null, null, null,
            "Value entered by you; never auto-refreshed"));

        return results;
    }

    private static bool HasCompleteAddress(PropertyProfile p)
    {
        return !string.IsNullOrWhiteSpace(p.Street)
            && !string.IsNullOrWhiteSpace(p.City)
            && !string.IsNullOrWhiteSpace(p.State)
            && !string.IsNullOrWhiteSpace(p.PostalCode);
    }
}
