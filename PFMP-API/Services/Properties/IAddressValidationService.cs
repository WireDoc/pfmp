namespace PFMP_API.Services.Properties;

/// <summary>
/// Result of an address standardization/validation lookup.
/// </summary>
public record StandardizedAddress(
    string Street,
    string City,
    string State,
    string Zip5,
    string? Zip4,
    bool IsValid,
    string? Error
);

/// <summary>
/// Validates and standardizes US mailing addresses.
/// Wave 15 — supports USPS Web Tools with manual-entry fallback.
/// </summary>
public interface IAddressValidationService
{
    /// <summary>
    /// Validate and standardize a US address. Returns a standardized address or
    /// an invalid result with an error message.
    /// </summary>
    Task<StandardizedAddress> ValidateAsync(string street, string city, string state, string zip);
}
