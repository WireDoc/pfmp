using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PFMP_API.Models;

namespace PFMP_API.Services.AI;

/// <summary>
/// Wave 22 Phase C — DB-backed model resolver. See <see cref="IAIModelResolver"/>.
/// </summary>
public class AIModelResolver : IAIModelResolver
{
    private readonly ApplicationDbContext _db;
    private readonly OpenRouterOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AIModelResolver> _logger;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(30);
    private const string CacheKeyAll = "AIModelResolver:AllSettings";

    public AIModelResolver(
        ApplicationDbContext db,
        IOptions<OpenRouterOptions> options,
        IMemoryCache cache,
        ILogger<AIModelResolver> logger)
    {
        _db = db;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<ResolvedModelConfig> ResolveAsync(AIModelSlot slot, CancellationToken ct = default)
    {
        var all = await GetAllSettingsCachedAsync(ct);
        all.TryGetValue(slot, out var row);
        return Merge(slot, row);
    }

    public void InvalidateCache() => _cache.Remove(CacheKeyAll);

    private Task<Dictionary<AIModelSlot, AISettings>> GetAllSettingsCachedAsync(CancellationToken ct)
    {
        return _cache.GetOrCreateAsync(CacheKeyAll, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            var rows = await _db.AISettings.AsNoTracking().ToListAsync(ct);
            return rows.ToDictionary(r => r.Slot, r => r);
        })!;
    }

    private ResolvedModelConfig Merge(AIModelSlot slot, AISettings? row)
    {
        var sources = new Dictionary<string, string>();

        string SourceTrack(string fieldName, string? dbValue, string fallback)
        {
            if (!string.IsNullOrWhiteSpace(dbValue))
            {
                sources[fieldName] = "db";
                return dbValue!;
            }
            sources[fieldName] = "appsettings";
            return fallback;
        }

        T? SourceTrackNullable<T>(string fieldName, T? dbValue, T? fallback) where T : struct
        {
            if (dbValue.HasValue)
            {
                sources[fieldName] = "db";
                return dbValue;
            }
            sources[fieldName] = fallback.HasValue ? "appsettings" : "unset";
            return fallback;
        }

        var defaultModel = slot switch
        {
            AIModelSlot.Primary => _options.PrimaryModel,
            AIModelSlot.Verifier => _options.VerifierModel,
            AIModelSlot.Chat => _options.ChatModel,
            AIModelSlot.News => _options.NewsModel,
            AIModelSlot.Fusion => _options.Fusion.Model,
            _ => _options.PrimaryModel
        };

        var model = SourceTrack("Model", row?.Model, defaultModel);
        var maxTokens = SourceTrackNullable<int>("MaxTokens", row?.MaxTokens, _options.MaxTokens) ?? _options.MaxTokens;
        var temperature = SourceTrackNullable<decimal>("Temperature", row?.Temperature, _options.Temperature) ?? _options.Temperature;
        var topP = SourceTrackNullable<decimal>("TopP", row?.TopP, null);
        var reasoningEffort = SourceTrackNullable<AIReasoningEffort>("ReasoningEffort", row?.ReasoningEffort, null);
        var reasoningExclude = SourceTrackNullable<bool>("ReasoningExclude", row?.ReasoningExclude, null);
        var reasoningMaxTokens = SourceTrackNullable<int>("ReasoningMaxTokens", row?.ReasoningMaxTokens, null);

        // Fusion-only fields fall back to the FusionOptions section
        string? fusionPreset = null;
        string? fusionJudgeModel = null;
        int? fusionMaxToolCalls = null;
        if (slot == AIModelSlot.Fusion)
        {
            fusionPreset = SourceTrack("FusionPreset", row?.FusionPreset, _options.Fusion.Preset);
            fusionJudgeModel = SourceTrack("FusionJudgeModel", row?.FusionJudgeModel, _options.Fusion.JudgeModel);
            fusionMaxToolCalls = SourceTrackNullable<int>("FusionMaxToolCalls", row?.FusionMaxToolCalls, _options.Fusion.MaxToolCalls)
                                 ?? _options.Fusion.MaxToolCalls;
        }

        return new ResolvedModelConfig
        {
            Slot = slot,
            Model = model,
            MaxTokens = maxTokens,
            Temperature = temperature,
            TopP = topP,
            ReasoningEffort = reasoningEffort,
            ReasoningExclude = reasoningExclude,
            ReasoningMaxTokens = reasoningMaxTokens,
            FusionPreset = fusionPreset,
            FusionJudgeModel = fusionJudgeModel,
            FusionMaxToolCalls = fusionMaxToolCalls,
            FieldSources = sources
        };
    }
}
