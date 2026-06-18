using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Wave 22 Phase C — see <see cref="IOpenRouterModelCatalog"/>.
/// Registered as singleton so the cached catalog lives across requests.
/// </summary>
public class OpenRouterModelCatalog : IOpenRouterModelCatalog
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<OpenRouterModelCatalog> _logger;
    private readonly SemaphoreSlim _fetchLock = new(1, 1);

    // Cached catalog — 24h TTL but only refreshed on explicit Refresh call or cold start.
    private OpenRouterCatalog? _cached;
    private static readonly TimeSpan StaleAfter = TimeSpan.FromHours(24);

    public OpenRouterModelCatalog(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        ILogger<OpenRouterModelCatalog> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<OpenRouterCatalog> GetCatalogAsync(CancellationToken ct = default)
    {
        if (_cached != null) return _cached;
        return await RefreshCatalogAsync(ct);
    }

    public async Task<OpenRouterCatalog> RefreshCatalogAsync(CancellationToken ct = default)
    {
        await _fetchLock.WaitAsync(ct);
        try
        {
            _logger.LogInformation("Fetching OpenRouter model catalog (manual refresh or cold start)");

            // OpenRouter's models endpoint sits at the API root, not the chat-completions URL.
            // Derive root by trimming the /chat/completions path off BaseUrl.
            var modelsUrl = _options.BaseUrl.Replace("/chat/completions", "/models", StringComparison.OrdinalIgnoreCase);

            var client = _httpClientFactory.CreateClient("OpenRouter");
            client.Timeout = TimeSpan.FromSeconds(30);

            var req = new HttpRequestMessage(HttpMethod.Get, modelsUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            if (!string.IsNullOrEmpty(_options.SiteName))
                req.Headers.Add("X-Title", _options.SiteName);

            var resp = await client.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var errBody = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Catalog fetch failed: {Status} {Body}", resp.StatusCode, errBody[..Math.Min(500, errBody.Length)]);
                // Return cached if available, else throw so the admin UI can surface the error
                if (_cached != null) return _cached;
                throw new HttpRequestException($"OpenRouter /models returned {resp.StatusCode}");
            }

            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            var data = doc.RootElement.GetProperty("data");

            var models = new List<OpenRouterModelInfo>();
            foreach (var item in data.EnumerateArray())
            {
                models.Add(ParseModelInfo(item));
            }

            // OpenRouter returns ~600+ models; sort by id for stable display.
            models = models.OrderBy(m => m.Id, StringComparer.Ordinal).ToList();

            _cached = new OpenRouterCatalog
            {
                Models = models,
                FetchedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Catalog refreshed: {Count} models cached", models.Count);
            return _cached;
        }
        finally
        {
            _fetchLock.Release();
        }
    }

    private static OpenRouterModelInfo ParseModelInfo(JsonElement item)
    {
        var id = item.GetProperty("id").GetString() ?? "";
        var name = item.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? id : id;
        string? description = item.TryGetProperty("description", out var d) ? d.GetString() : null;
        long? contextLength = item.TryGetProperty("context_length", out var cl) && cl.ValueKind == JsonValueKind.Number
            ? cl.GetInt64() : null;

        decimal? promptCost = null;
        decimal? completionCost = null;
        if (item.TryGetProperty("pricing", out var pricing))
        {
            // Pricing is reported as USD per token as a string (e.g. "0.000003")
            if (pricing.TryGetProperty("prompt", out var p) && decimal.TryParse(p.GetString(), out var pVal))
                promptCost = pVal * 1_000_000m;
            if (pricing.TryGetProperty("completion", out var c) && decimal.TryParse(c.GetString(), out var cVal))
                completionCost = cVal * 1_000_000m;
        }

        List<string>? supportedParams = null;
        if (item.TryGetProperty("supported_parameters", out var sp) && sp.ValueKind == JsonValueKind.Array)
        {
            supportedParams = sp.EnumerateArray().Select(p => p.GetString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList();
        }

        DateTime? created = null;
        if (item.TryGetProperty("created", out var cr) && cr.ValueKind == JsonValueKind.Number)
        {
            created = DateTimeOffset.FromUnixTimeSeconds(cr.GetInt64()).UtcDateTime;
        }

        return new OpenRouterModelInfo
        {
            Id = id,
            Name = name,
            Description = description,
            ContextLength = contextLength,
            PromptCostPer1M = promptCost,
            CompletionCostPer1M = completionCost,
            SupportedParameters = supportedParams,
            Created = created
        };
    }
}
