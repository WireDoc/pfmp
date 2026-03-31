using System.Net;
using System.Xml.Linq;

namespace PFMP_API.Services.Properties;

/// <summary>
/// USPS Web Tools Address Validation API implementation.
/// Free government API — requires a USPS Web Tools User ID (register at
/// https://www.usps.com/business/web-tools-apis/).
///
/// Note: USPS only covers mailing addresses. Vacant lots, new construction,
/// or PO-box-only areas may not validate. The caller should allow manual
/// entry when validation fails.
/// </summary>
public class UspsAddressValidationService : IAddressValidationService
{
    private readonly HttpClient _httpClient;
    private readonly string _uspsUserId;
    private readonly ILogger<UspsAddressValidationService> _logger;
    private readonly bool _isConfigured;

    private const string UspsBaseUrl = "https://secure.shippingapis.com/ShippingAPI.dll";

    public UspsAddressValidationService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<UspsAddressValidationService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("USPS");
        _uspsUserId = configuration["PropertyValuation:UspsUserId"] ?? string.Empty;
        _logger = logger;
        _isConfigured = !string.IsNullOrWhiteSpace(_uspsUserId);

        if (!_isConfigured)
        {
            _logger.LogWarning("USPS Web Tools User ID not configured — address validation will pass through without standardization. " +
                               "Set PropertyValuation:UspsUserId in appsettings to enable.");
        }
    }

    public async Task<StandardizedAddress> ValidateAsync(string street, string city, string state, string zip)
    {
        // Pass-through if USPS is not configured — treat the address as valid but un-standardized
        if (!_isConfigured)
        {
            return new StandardizedAddress(
                Street: street.Trim(),
                City: city.Trim(),
                State: state.Trim().ToUpperInvariant(),
                Zip5: zip.Trim(),
                Zip4: null,
                IsValid: true,
                Error: null
            );
        }

        try
        {
            var xml = BuildRequestXml(street, city, state, zip);
            var url = $"{UspsBaseUrl}?API=Verify&XML={WebUtility.UrlEncode(xml)}";

            var response = await _httpClient.GetStringAsync(url);
            return ParseResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "USPS address validation failed for {Street}, {City}, {State} {Zip}",
                street, city, state, zip);

            // On error, pass through the original address so the user isn't blocked
            return new StandardizedAddress(
                Street: street.Trim(),
                City: city.Trim(),
                State: state.Trim().ToUpperInvariant(),
                Zip5: zip.Trim(),
                Zip4: null,
                IsValid: true,
                Error: $"Validation service unavailable: {ex.Message}"
            );
        }
    }

    private string BuildRequestXml(string street, string city, string state, string zip)
    {
        return $@"<AddressValidateRequest USERID=""{WebUtility.HtmlEncode(_uspsUserId)}"">
  <Address>
    <Address1/>
    <Address2>{WebUtility.HtmlEncode(street)}</Address2>
    <City>{WebUtility.HtmlEncode(city)}</City>
    <State>{WebUtility.HtmlEncode(state)}</State>
    <Zip5>{WebUtility.HtmlEncode(zip)}</Zip5>
    <Zip4/>
  </Address>
</AddressValidateRequest>";
    }

    private StandardizedAddress ParseResponse(string xml)
    {
        var doc = XDocument.Parse(xml);
        var address = doc.Descendants("Address").FirstOrDefault();

        if (address == null)
        {
            return new StandardizedAddress("", "", "", "", null, false, "No address element in USPS response");
        }

        // Check for error element
        var error = address.Element("Error");
        if (error != null)
        {
            var desc = error.Element("Description")?.Value ?? "Address not found";
            return new StandardizedAddress("", "", "", "", null, false, desc);
        }

        return new StandardizedAddress(
            Street: address.Element("Address2")?.Value ?? "",
            City: address.Element("City")?.Value ?? "",
            State: address.Element("State")?.Value ?? "",
            Zip5: address.Element("Zip5")?.Value ?? "",
            Zip4: address.Element("Zip4")?.Value,
            IsValid: true,
            Error: null
        );
    }
}
