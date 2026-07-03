namespace PFMP_API.Services.Properties;

/// <summary>
/// Result of a property valuation lookup from an AVM provider.
/// </summary>
public record PropertyValuation(
    decimal EstimatedValue,
    decimal? LowEstimate,
    decimal? HighEstimate,
    string Source,
    DateTime FetchedAt,
    decimal? ConfidenceScore
);

/// <summary>
/// Everything a provider might need to produce a valuation. Address fields are
/// always populated; anchor fields are only set when the property has them
/// (used by the FHFA HPI walk-forward provider, ignored by AVM providers).
/// </summary>
public record PropertyValuationRequest(
    string Street,
    string City,
    string State,
    string Zip,
    decimal? AnchorValue = null,
    DateTime? AnchorDate = null
);

/// <summary>
/// Abstraction for a property valuation provider.
/// Wave 15 shipped Estated (retired) then RentCast; Wave 25 follow-on added
/// FhfaHpi and per-property provider selection.
/// </summary>
public interface IPropertyValuationProvider
{
    /// <summary>
    /// Stable identifier used in Properties.PreferredValuationProvider and the
    /// PropertyValuation:DefaultProvider config key (e.g. "RentCast", "FhfaHpi").
    /// </summary>
    string ProviderName { get; }

    /// <summary>Whether the provider has what it needs to be called (API key etc.).</summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Fetch a property valuation. Returns null if the property cannot be valued
    /// (no data for address, missing anchor for index providers, etc.).
    /// </summary>
    Task<PropertyValuation?> GetValuationAsync(PropertyValuationRequest request);
}
