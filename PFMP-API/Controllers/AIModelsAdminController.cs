using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models;
using PFMP_API.Services.AI;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace PFMP_API.Controllers;

/// <summary>
/// Wave 22 Phase C — admin endpoints for the AI model picker UI.
///
/// All endpoints under /api/admin/ai-models. No auth in dev (matches existing
/// AISpikeController pattern); add admin-role gating before any prod rollout.
/// See: docs/waves/wave-22-ai-architecture-overhaul.md
/// </summary>
[ApiController]
[Route("api/admin/ai-models")]
public class AIModelsAdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAIModelResolver _resolver;
    private readonly IOpenRouterModelCatalog _catalog;
    private readonly OpenRouterOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AIModelsAdminController> _logger;

    public AIModelsAdminController(
        ApplicationDbContext db,
        IAIModelResolver resolver,
        IOpenRouterModelCatalog catalog,
        IOptions<OpenRouterOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<AIModelsAdminController> logger)
    {
        _db = db;
        _resolver = resolver;
        _catalog = catalog;
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/ai-models — returns the resolved (DB + appsettings fallback) config
    /// for every slot, plus the raw AISettings row when one exists. The frontend uses this
    /// to render the form with "(default from appsettings)" placeholders for unset fields.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var rows = await _db.AISettings.AsNoTracking().ToListAsync();
        var slots = Enum.GetValues<AIModelSlot>();

        var result = new List<object>();
        foreach (var slot in slots)
        {
            var resolved = await _resolver.ResolveAsync(slot);
            var row = rows.FirstOrDefault(r => r.Slot == slot);
            result.Add(new
            {
                slot = slot.ToString(),
                row = row == null ? null : ToDto(row),
                resolved = ToResolvedDto(resolved)
            });
        }

        return Ok(new
        {
            slots = result,
            appsettings = new
            {
                primaryModel = _options.PrimaryModel,
                verifierModel = _options.VerifierModel,
                chatModel = _options.ChatModel,
                newsModel = _options.NewsModel,
                fusionModel = _options.Fusion.Model,
                fusionPreset = _options.Fusion.Preset,
                fusionJudgeModel = _options.Fusion.JudgeModel,
                fusionMaxToolCalls = _options.Fusion.MaxToolCalls,
                maxTokens = _options.MaxTokens,
                temperature = _options.Temperature
            }
        });
    }

    /// <summary>
    /// PUT /api/admin/ai-models/{slot} — upserts overrides for one slot.
    /// Body fields are nullable; any field omitted/null clears the override and falls
    /// back to appsettings on the next resolve.
    /// </summary>
    [HttpPut("{slot}")]
    public async Task<ActionResult> Upsert(string slot, [FromBody] AISettingsUpsertDto body)
    {
        if (!Enum.TryParse<AIModelSlot>(slot, true, out var parsedSlot))
            return BadRequest(new { error = $"Unknown slot '{slot}'. Valid: {string.Join(", ", Enum.GetNames<AIModelSlot>())}" });

        var existing = await _db.AISettings.FirstOrDefaultAsync(r => r.Slot == parsedSlot);
        var now = DateTime.UtcNow;

        if (existing == null)
        {
            existing = new AISettings
            {
                Slot = parsedSlot,
                CreatedAt = now,
                UpdatedAt = now
            };
            _db.AISettings.Add(existing);
        }
        else
        {
            existing.UpdatedAt = now;
        }

        existing.Model = NormalizeString(body.Model);
        existing.MaxTokens = body.MaxTokens;
        existing.Temperature = body.Temperature;
        existing.TopP = body.TopP;
        existing.ReasoningEffort = body.ReasoningEffort;
        existing.ReasoningExclude = body.ReasoningExclude;
        existing.ReasoningMaxTokens = body.ReasoningMaxTokens;
        existing.FusionPreset = NormalizeString(body.FusionPreset);
        existing.FusionJudgeModel = NormalizeString(body.FusionJudgeModel);
        existing.FusionMaxToolCalls = body.FusionMaxToolCalls;

        await _db.SaveChangesAsync();
        _resolver.InvalidateCache();

        _logger.LogInformation("AI model override saved: slot={Slot}, model={Model}", parsedSlot, existing.Model ?? "(null/fallback)");

        var resolved = await _resolver.ResolveAsync(parsedSlot);
        return Ok(new
        {
            slot = parsedSlot.ToString(),
            row = ToDto(existing),
            resolved = ToResolvedDto(resolved)
        });
    }

    /// <summary>
    /// POST /api/admin/ai-models/{slot}/test — issues a tiny "Reply OK" completion against
    /// the slot's resolved model. Measures latency and dollar cost. Used by the per-slot
    /// "Test" button in the admin UI.
    /// </summary>
    [HttpPost("{slot}/test")]
    public async Task<ActionResult> TestPing(string slot)
    {
        if (!Enum.TryParse<AIModelSlot>(slot, true, out var parsedSlot))
            return BadRequest(new { error = $"Unknown slot '{slot}'" });

        var config = await _resolver.ResolveAsync(parsedSlot);

        var payload = new
        {
            model = config.Model,
            messages = new[]
            {
                new { role = "user", content = "Reply with exactly the word OK and nothing else." }
            },
            max_tokens = 10,
            temperature = 0.0,
            usage = new { include = true }
        };

        var sw = Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient("OpenRouter");
            client.Timeout = TimeSpan.FromSeconds(30);
            var req = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            if (!string.IsNullOrEmpty(_options.SiteName))
                req.Headers.Add("X-Title", _options.SiteName);

            var json = JsonSerializer.Serialize(payload);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var resp = await client.SendAsync(req);
            var body = await resp.Content.ReadAsStringAsync();
            sw.Stop();

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Test ping failed: slot={Slot}, status={Status}, body={Body}",
                    parsedSlot, resp.StatusCode, body[..Math.Min(300, body.Length)]);
                return Ok(new
                {
                    slot = parsedSlot.ToString(),
                    model = config.Model,
                    success = false,
                    elapsedMs = sw.Elapsed.TotalMilliseconds,
                    error = $"HTTP {(int)resp.StatusCode}: {body[..Math.Min(300, body.Length)]}"
                });
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var content = root.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
            decimal cost = 0;
            int tokens = 0;
            string actualModel = config.Model;
            if (root.TryGetProperty("usage", out var usage))
            {
                if (usage.TryGetProperty("cost", out var c) && c.ValueKind == JsonValueKind.Number)
                    cost = c.GetDecimal();
                if (usage.TryGetProperty("total_tokens", out var t) && t.ValueKind == JsonValueKind.Number)
                    tokens = t.GetInt32();
            }
            if (root.TryGetProperty("model", out var m))
                actualModel = m.GetString() ?? config.Model;

            return Ok(new
            {
                slot = parsedSlot.ToString(),
                requestedModel = config.Model,
                actualModel,
                success = true,
                elapsedMs = sw.Elapsed.TotalMilliseconds,
                cost,
                tokens,
                response = content
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Test ping exception: slot={Slot}", parsedSlot);
            return Ok(new
            {
                slot = parsedSlot.ToString(),
                model = config.Model,
                success = false,
                elapsedMs = sw.Elapsed.TotalMilliseconds,
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// GET /api/admin/ai-models/catalog — returns the cached OpenRouter model catalog.
    /// Will cold-fetch on first call after startup; otherwise returns the cached copy.
    /// </summary>
    [HttpGet("catalog")]
    public async Task<ActionResult> GetCatalog(CancellationToken ct)
    {
        try
        {
            var catalog = await _catalog.GetCatalogAsync(ct);
            return Ok(new
            {
                fetchedAt = catalog.FetchedAt,
                count = catalog.Count,
                models = catalog.Models
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Catalog fetch failed");
            return StatusCode(502, new { error = "Catalog unavailable", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/admin/ai-models/catalog/refresh — force-refetches the catalog from OpenRouter.
    /// </summary>
    [HttpPost("catalog/refresh")]
    public async Task<ActionResult> RefreshCatalog(CancellationToken ct)
    {
        try
        {
            var catalog = await _catalog.RefreshCatalogAsync(ct);
            return Ok(new
            {
                fetchedAt = catalog.FetchedAt,
                count = catalog.Count,
                models = catalog.Models
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Catalog refresh failed");
            return StatusCode(502, new { error = "Refresh failed", details = ex.Message });
        }
    }

    private static string? NormalizeString(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static object ToDto(AISettings row) => new
    {
        id = row.Id,
        slot = row.Slot.ToString(),
        model = row.Model,
        maxTokens = row.MaxTokens,
        temperature = row.Temperature,
        topP = row.TopP,
        reasoningEffort = row.ReasoningEffort?.ToString(),
        reasoningExclude = row.ReasoningExclude,
        reasoningMaxTokens = row.ReasoningMaxTokens,
        fusionPreset = row.FusionPreset,
        fusionJudgeModel = row.FusionJudgeModel,
        fusionMaxToolCalls = row.FusionMaxToolCalls,
        createdAt = row.CreatedAt,
        updatedAt = row.UpdatedAt
    };

    private static object ToResolvedDto(ResolvedModelConfig c) => new
    {
        slot = c.Slot.ToString(),
        model = c.Model,
        maxTokens = c.MaxTokens,
        temperature = c.Temperature,
        topP = c.TopP,
        reasoningEffort = c.ReasoningEffort?.ToString(),
        reasoningExclude = c.ReasoningExclude,
        reasoningMaxTokens = c.ReasoningMaxTokens,
        fusionPreset = c.FusionPreset,
        fusionJudgeModel = c.FusionJudgeModel,
        fusionMaxToolCalls = c.FusionMaxToolCalls,
        fieldSources = c.FieldSources
    };

    public class AISettingsUpsertDto
    {
        public string? Model { get; set; }
        public int? MaxTokens { get; set; }
        public decimal? Temperature { get; set; }
        public decimal? TopP { get; set; }
        public AIReasoningEffort? ReasoningEffort { get; set; }
        public bool? ReasoningExclude { get; set; }
        public int? ReasoningMaxTokens { get; set; }
        public string? FusionPreset { get; set; }
        public string? FusionJudgeModel { get; set; }
        public int? FusionMaxToolCalls { get; set; }
    }
}
