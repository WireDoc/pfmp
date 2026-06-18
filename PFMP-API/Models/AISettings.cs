using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models;

/// <summary>
/// Wave 22 Phase C — per-slot AI model overrides editable from the admin UI.
///
/// One row per <see cref="AIModelSlot"/>. Any nullable field falls back to the
/// corresponding default in appsettings.json → AI:OpenRouter when null/empty.
/// This lets the admin UI surface "(default)" placeholders and edit specific
/// fields without forcing every parameter to be re-specified every time.
///
/// See: docs/waves/wave-22-ai-architecture-overhaul.md
/// </summary>
[Table("AISettings")]
public class AISettings
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Which workload this row configures. Unique — one row per slot.
    /// </summary>
    [Required]
    public AIModelSlot Slot { get; set; }

    // ----- Common per-slot params (apply to all slots; null = fall back to appsettings) -----

    /// <summary>OpenRouter model slug (e.g. "~google/gemini-pro-latest").</summary>
    [MaxLength(200)]
    public string? Model { get; set; }

    /// <summary>Max output tokens. Null falls back to OpenRouterOptions.MaxTokens.</summary>
    public int? MaxTokens { get; set; }

    /// <summary>Sampling temperature 0.0–2.0. Null falls back to OpenRouterOptions.Temperature.</summary>
    [Column(TypeName = "decimal(4,3)")]
    public decimal? Temperature { get; set; }

    /// <summary>Nucleus sampling top_p 0.0–1.0. Null = not sent (provider default).</summary>
    [Column(TypeName = "decimal(4,3)")]
    public decimal? TopP { get; set; }

    /// <summary>
    /// Reasoning effort for models that support it (OpenAI o-series, Anthropic extended thinking, etc.).
    /// Null = not sent. See <see cref="AIReasoningEffort"/>.
    /// </summary>
    public AIReasoningEffort? ReasoningEffort { get; set; }

    /// <summary>
    /// When true, reasoning tokens are billed but NOT returned in the response.
    /// Saves bandwidth for production workloads where you only want the final answer.
    /// Null = not sent (provider default = false/include reasoning).
    /// </summary>
    public bool? ReasoningExclude { get; set; }

    /// <summary>
    /// Caps how many reasoning tokens the model can spend before producing the answer.
    /// Null = not sent (provider default — uses ReasoningEffort to decide).
    /// </summary>
    public int? ReasoningMaxTokens { get; set; }

    // ----- Fusion-only (only meaningful when Slot = Fusion; null on other slots) -----

    /// <summary>Fusion preset name ("general-high" or "general-budget").</summary>
    [MaxLength(50)]
    public string? FusionPreset { get; set; }

    /// <summary>Override for the Fusion judge model (e.g. "~anthropic/claude-sonnet-latest"). Empty = use preset default.</summary>
    [MaxLength(200)]
    public string? FusionJudgeModel { get; set; }

    /// <summary>Maximum tool calls (web search/fetch) per Fusion panelist. Lower bounds the cost of search-heavy prompts.</summary>
    public int? FusionMaxToolCalls { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Which AI workload role a settings row applies to.
/// Matches the role discriminator used in <c>OpenRouterService</c> DI registration.
/// </summary>
public enum AIModelSlot
{
    Primary = 0,
    Verifier = 1,
    Chat = 2,
    News = 3,
    Fusion = 4
}

/// <summary>
/// Reasoning effort tier for models that expose the OpenAI-style reasoning param.
/// Mapped to OpenRouter's reasoning.effort string field at request time.
/// </summary>
public enum AIReasoningEffort
{
    Minimal = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    XHigh = 4
}
