using System.Text.Json;

namespace PFMP_API.Services.Properties;

/// <summary>
/// Estated Property Data API — Automated Valuation Model (AVM).
/// Docs: https://estated.com/developers/docs
/// ~$0.10–0.50 per lookup for US residential properties.
///
/// When the API key is not configured, returns null (no valuation).
/// </summary>
public class EstatedValuationProvider : IPropertyValuationProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiToken;
    private readonly ILogger<EstatedValuationProvider> _logger;
    private readonly bool _isConfigured;

    private const string BaseUrl = "https://apis.estated.com/v4/property";

    public string ProviderName => "estated";

    public EstatedValuationProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<EstatedValuationProvider> logger)
    {
        _httpClient = httpClientFactory.CreateClient("Estated");
        _apiToken = configuration["PropertyValuation:EstatedApiToken"] ?? string.Empty;
        _logger = logger;
        _isConfigured = !string.IsNullOrWhiteSpace(_apiToken);

        if (!_isConfigured)
        {
            _logger.LogWarning("Estated API token not configured — property valuations will not be available. " +
                               "Set PropertyValuation:EstatedApiToken in appsettings to enable.");
        }
    }

    public bool IsConfigured => _isConfigured;

    public async Task<PropertyValuation?> GetValuationAsync(string street, string city, string state, string zip)
    {
        if (!_isConfigured)
            return null;

        try
        {
            var url = $"{BaseUrl}?token={_apiToken}" +
                      $"&combined_address={Uri.EscapeDataString($"{street}, {city}, {state} {zip}")}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Estated API returned {StatusCode} for {Street}, {City}, {State} {Zip}",
                    response.StatusCode, street, city, state, zip);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return ParseResponse(json, street, city, state, zip);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Estated valuation lookup failed for {Street}, {City}, {State} {Zip}",
                street, city, state, zip);
            return null;
        }
    }

    private PropertyValuation? ParseResponse(string json, string street, string city, string state, string zip)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Check for API-level errors
        if (root.TryGetProperty("error", out var errorProp) && errorProp.ValueKind != JsonValueKind.Null)
        {
            _logger.LogWarning("Estated API error for {Street}, {City}, {State} {Zip}: {Error}",
                street, city, state, zip, errorProp.ToString());
            return null;
        }

        // Navigate to valuation data
        if (!root.TryGetProperty("data", out var data))
            return null;

        if (!data.TryGetProperty("valuation", out var valuation))
            return null;

        // Get the primary estimated value
        decimal? estimatedValue = null;
        if (valuation.TryGetProperty("value", out var valueElement) && valueElement.ValueKind == JsonValueKind.Number)
            estimatedValue = valueElement.GetDecimal();

        if (!estimatedValue.HasValue || estimatedValue.Value <= 0)
        {
            _logger.LogInformation("No valuation data available for {Street}, {City}, {State} {Zip}", street, city, state, zip);
            return null;
        }

        // Get range estimates
        decimal? low = null, high = null;
        if (valuation.TryGetProperty("low", out var lowElement) && lowElement.ValueKind == JsonValueKind.Number)
            low = lowElement.GetDecimal();
        if (valuation.TryGetProperty("high", out var highElement) && highElement.ValueKind == JsonValueKind.Number)
            high = highElement.GetDecimal();

        // Confidence is not always available from Estated, but some responses include it
        decimal? confidence = null;
        if (valuation.TryGetProperty("confidence_score", out var confElement) && confElement.ValueKind == JsonValueKind.Number)
            confidence = confElement.GetDecimal();

        return new PropertyValuation(
            EstimatedValue: estimatedValue.Value,
            LowEstimate: low,
            HighEstimate: high,
            Source: ProviderName,
            FetchedAt: DateTime.UtcNow,
            ConfidenceScore: confidence
        );
    }
}
