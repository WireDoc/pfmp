using System.Text.Json;

namespace PFMP_API.Services.Properties;

/// <summary>
/// RentCast Property Data API — Automated Valuation Model (AVM).
/// Docs: https://developers.rentcast.io/reference/value-estimate
/// Free tier: 50 calls/month. API key passed via X-Api-Key header.
/// </summary>
public class RentCastValuationProvider : IPropertyValuationProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<RentCastValuationProvider> _logger;
    private readonly bool _isConfigured;

    private const string BaseUrl = "https://api.rentcast.io/v1/avm/value";

    public string ProviderName => "rentcast";
    public bool IsConfigured => _isConfigured;

    public RentCastValuationProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<RentCastValuationProvider> logger)
    {
        _httpClient = httpClientFactory.CreateClient("RentCast");
        _apiKey = configuration["PropertyValuation:RentCastApiKey"] ?? string.Empty;
        _logger = logger;
        _isConfigured = !string.IsNullOrWhiteSpace(_apiKey);

        if (!_isConfigured)
        {
            _logger.LogWarning("RentCast API key not configured — property valuations will not be available. " +
                               "Set PropertyValuation:RentCastApiKey in appsettings to enable.");
        }
    }

    public async Task<PropertyValuation?> GetValuationAsync(string street, string city, string state, string zip)
    {
        if (!_isConfigured)
            return null;

        try
        {
            var combinedAddress = $"{street}, {city}, {state}, {zip}";
            var url = $"{BaseUrl}?address={Uri.EscapeDataString(combinedAddress)}&compCount=5";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-Api-Key", _apiKey);
            request.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("RentCast API returned {StatusCode} for {Address}: {Body}",
                    response.StatusCode, combinedAddress, body);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return ParseResponse(json, combinedAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RentCast valuation lookup failed for {Street}, {City}, {State} {Zip}",
                street, city, state, zip);
            return null;
        }
    }

    private PropertyValuation? ParseResponse(string json, string address)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Get the primary estimated value
        if (!root.TryGetProperty("price", out var priceElement) || priceElement.ValueKind != JsonValueKind.Number)
        {
            _logger.LogInformation("No valuation price returned for {Address}", address);
            return null;
        }

        var price = priceElement.GetDecimal();
        if (price <= 0)
        {
            _logger.LogInformation("Zero or negative valuation for {Address}", address);
            return null;
        }

        // Get range estimates
        decimal? low = null, high = null;
        if (root.TryGetProperty("priceRangeLow", out var lowEl) && lowEl.ValueKind == JsonValueKind.Number)
            low = lowEl.GetDecimal();
        if (root.TryGetProperty("priceRangeHigh", out var highEl) && highEl.ValueKind == JsonValueKind.Number)
            high = highEl.GetDecimal();

        // RentCast doesn't return a confidence score directly, but we can derive one
        // from the range tightness relative to the estimate
        decimal? confidence = null;
        if (low.HasValue && high.HasValue && high.Value > 0 && price > 0)
        {
            var range = high.Value - low.Value;
            // Tighter range = higher confidence. A range of 0 = 1.0, range = price = ~0.5
            confidence = Math.Max(0, Math.Min(1, 1m - (range / (2m * price))));
        }

        return new PropertyValuation(
            EstimatedValue: price,
            LowEstimate: low,
            HighEstimate: high,
            Source: ProviderName,
            FetchedAt: DateTime.UtcNow,
            ConfidenceScore: confidence
        );
    }
}
