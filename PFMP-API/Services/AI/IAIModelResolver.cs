using PFMP_API.Models;

namespace PFMP_API.Services.AI;

/// <summary>
/// Wave 22 Phase C — resolves the effective model + sampling parameters for a given
/// AI workload slot, merging DB-stored admin overrides with the appsettings.json
/// defaults under AI:OpenRouter.
///
/// Reads from the AISettings table; falls back to <see cref="OpenRouterOptions"/>
/// for any null/empty field. Maintains a short in-memory cache (~30 seconds) so
/// hot paths don't hit the DB on every AI call.
///
/// Callers (e.g. <c>OpenRouterService</c>, <c>FusionAIAdvisor</c>) should call
/// <see cref="ResolveAsync"/> per-request to pick up admin-UI changes without
/// needing an app restart.
/// </summary>
public interface IAIModelResolver
{
    /// <summary>
    /// Resolves effective model + sampling parameters for the given slot.
    /// </summary>
    Task<ResolvedModelConfig> ResolveAsync(AIModelSlot slot, CancellationToken ct = default);

    /// <summary>
    /// Invalidates the in-memory cache. Called after admin UI writes so the next
    /// resolve picks up the change immediately rather than waiting for cache expiry.
    /// </summary>
    void InvalidateCache();
}

/// <summary>
/// Effective configuration for one AI workload slot after merging admin overrides
/// with appsettings defaults.
/// </summary>
public class ResolvedModelConfig
{
    public AIModelSlot Slot { get; init; }
    public required string Model { get; init; }
    public required int MaxTokens { get; init; }
    public required decimal Temperature { get; init; }
    public decimal? TopP { get; init; }
    public AIReasoningEffort? ReasoningEffort { get; init; }
    public bool? ReasoningExclude { get; init; }
    public int? ReasoningMaxTokens { get; init; }

    // Fusion-only — only populated for AIModelSlot.Fusion
    public string? FusionPreset { get; init; }
    public string? FusionJudgeModel { get; init; }
    public int? FusionMaxToolCalls { get; init; }

    /// <summary>
    /// Source of each field — "db" if admin override applied, "appsettings" if fallback used.
    /// Helps the admin UI render "(default)" placeholders.
    /// </summary>
    public required Dictionary<string, string> FieldSources { get; init; }
}
