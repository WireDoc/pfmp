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
/// Abstraction for a property valuation provider (AVM).
/// Wave 15 — supports Estated with room for future providers.
/// </summary>
public interface IPropertyValuationProvider
{
    string ProviderName { get; }

    /// <summary>
    /// Fetch a property valuation for the given address.
    /// Returns null if the property cannot be valued (vacant lot, no data, etc.).
    /// </summary>
    Task<PropertyValuation?> GetValuationAsync(string street, string city, string state, string zip);
}
