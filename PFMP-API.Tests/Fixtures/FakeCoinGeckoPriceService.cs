using PFMP_API.Services.Crypto;

namespace PFMP_API.Tests.Fixtures;

/// <summary>
/// Test-only replacement for <see cref="ICoinGeckoPriceService"/> so integration tests never reach
/// the live CoinGecko API. Returns a flat $1.00 spot price for any symbol and a null id resolution
/// (callers fall back to the cached symbol). Override per-test if specific values are needed.
/// </summary>
public sealed class FakeCoinGeckoPriceService : ICoinGeckoPriceService
{
    public decimal DefaultPriceUsd { get; init; } = 1m;

    public Task<IReadOnlyDictionary<string, decimal>> GetSpotPricesUsdAsync(
        IEnumerable<string> symbols,
        CancellationToken cancellationToken = default)
    {
        var dict = symbols
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToDictionary(s => s, _ => DefaultPriceUsd, StringComparer.OrdinalIgnoreCase);
        return Task.FromResult<IReadOnlyDictionary<string, decimal>>(dict);
    }

    public Task<string?> ResolveCoinGeckoIdAsync(string symbol, CancellationToken cancellationToken = default)
        => Task.FromResult<string?>(null);
}
