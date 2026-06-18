namespace PFMP_API.Services.AI;

/// <summary>
/// Wave 22 Phase C — fetches and caches OpenRouter's model catalog (GET /api/v1/models).
///
/// Per user request: the catalog is NOT auto-refreshed. The cache TTL is 24 hours,
/// but only the admin-UI manual "Refresh catalog" button (or first cold-start access)
/// triggers a fetch. <see cref="GetCatalogAsync"/> returns the cached copy if present;
/// <see cref="RefreshCatalogAsync"/> forces a refetch.
/// </summary>
public interface IOpenRouterModelCatalog
{
    /// <summary>
    /// Returns the cached catalog, fetching once if no cached copy exists yet.
    /// Does NOT refresh stale data on its own — call <see cref="RefreshCatalogAsync"/> for that.
    /// </summary>
    Task<OpenRouterCatalog> GetCatalogAsync(CancellationToken ct = default);

    /// <summary>
    /// Force-refetches the catalog from OpenRouter and updates the cache.
    /// Only called from the admin UI's "Refresh catalog" button.
    /// </summary>
    Task<OpenRouterCatalog> RefreshCatalogAsync(CancellationToken ct = default);
}

public class OpenRouterCatalog
{
    public required List<OpenRouterModelInfo> Models { get; init; }
    public required DateTime FetchedAt { get; init; }
    public int Count => Models.Count;
}

public class OpenRouterModelInfo
{
    public required string Id { get; init; }              // e.g. "anthropic/claude-sonnet-4.6"
    public required string Name { get; init; }            // human-readable name
    public string? Description { get; init; }
    public long? ContextLength { get; init; }
    public decimal? PromptCostPer1M { get; init; }        // converted to $/1M input tokens
    public decimal? CompletionCostPer1M { get; init; }    // converted to $/1M output tokens
    public List<string>? SupportedParameters { get; init; }
    public DateTime? Created { get; init; }
}
