using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PFMP_API.Services.Crypto
{
    /// <summary>
    /// Wave 13: Spot price + symbol resolution against the free public CoinGecko API.
    /// No API key required. Resolves PFMP tickers (BTC, ETH) to CoinGecko ids (bitcoin, ethereum)
    /// and caches the mapping for the process lifetime.
    /// </summary>
    public interface ICoinGeckoPriceService
    {
        Task<IReadOnlyDictionary<string, decimal>> GetSpotPricesUsdAsync(IEnumerable<string> symbols, CancellationToken cancellationToken = default);
        Task<string?> ResolveCoinGeckoIdAsync(string symbol, CancellationToken cancellationToken = default);
    }

    public class CoinGeckoPriceService : ICoinGeckoPriceService
    {
        private const string BaseUrl = "https://api.coingecko.com/api/v3";
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        // In-memory caches (process lifetime). The bridge can be restarted to refresh.
        private static readonly Dictionary<string, string?> SymbolToIdCache = new(StringComparer.OrdinalIgnoreCase);
        private static List<CoinListEntry>? _coinListCache;
        private static DateTime _coinListLoadedAt = DateTime.MinValue;
        private static readonly SemaphoreSlim CoinListLock = new(1, 1);

        // Short-lived spot price cache so adapter sync + on-demand refresh don't hammer CoinGecko.
        private record SpotPriceEntry(decimal Price, DateTime At);
        private static readonly Dictionary<string, SpotPriceEntry> SpotPriceCache = new(StringComparer.OrdinalIgnoreCase);
        private static readonly TimeSpan SpotCacheTtl = TimeSpan.FromMinutes(15);

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<CoinGeckoPriceService> _logger;

        public CoinGeckoPriceService(IHttpClientFactory httpClientFactory, ILogger<CoinGeckoPriceService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<IReadOnlyDictionary<string, decimal>> GetSpotPricesUsdAsync(IEnumerable<string> symbols, CancellationToken cancellationToken = default)
        {
            var requested = symbols
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToUpperInvariant())
                .Distinct()
                .ToList();
            var result = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            if (requested.Count == 0) return result;

            // Serve from cache where possible.
            var stillNeeded = new List<string>();
            var now = DateTime.UtcNow;
            foreach (var sym in requested)
            {
                if (SpotPriceCache.TryGetValue(sym, out var cached) && now - cached.At < SpotCacheTtl)
                {
                    result[sym] = cached.Price;
                }
                else
                {
                    stillNeeded.Add(sym);
                }
            }

            if (stillNeeded.Count == 0) return result;

            // Resolve symbols → CoinGecko ids
            var idToSymbol = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var sym in stillNeeded)
            {
                var id = await ResolveCoinGeckoIdAsync(sym, cancellationToken);
                if (id is not null && !idToSymbol.ContainsKey(id))
                {
                    idToSymbol[id] = sym;
                }
            }
            if (idToSymbol.Count == 0) return result;

            var ids = string.Join(",", idToSymbol.Keys);
            var url = $"{BaseUrl}/simple/price?ids={Uri.EscapeDataString(ids)}&vs_currencies=usd";
            var http = _httpClientFactory.CreateClient("CoinGecko");

            try
            {
                using var response = await http.GetAsync(url, cancellationToken);
                response.EnsureSuccessStatusCode();
                var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, Dictionary<string, decimal>>>(JsonOptions, cancellationToken);
                if (payload is null) return result;

                foreach (var (id, prices) in payload)
                {
                    if (!idToSymbol.TryGetValue(id, out var sym)) continue;
                    if (!prices.TryGetValue("usd", out var price)) continue;
                    result[sym] = price;
                    SpotPriceCache[sym] = new SpotPriceEntry(price, now);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CoinGecko spot price fetch failed for {Ids}", ids);
            }

            return result;
        }

        public async Task<string?> ResolveCoinGeckoIdAsync(string symbol, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(symbol)) return null;
            var key = symbol.Trim().ToUpperInvariant();
            if (SymbolToIdCache.TryGetValue(key, out var cached)) return cached;

            await EnsureCoinListLoadedAsync(cancellationToken);

            if (_coinListCache is null)
            {
                SymbolToIdCache[key] = null;
                return null;
            }

            // Many symbols collide (e.g. "UNI" maps to several coins). Prefer matches whose id equals the
            // lower-case symbol (common for top-tier coins) and otherwise pick the first match.
            var matches = _coinListCache
                .Where(c => string.Equals(c.Symbol, key, StringComparison.OrdinalIgnoreCase))
                .ToList();
            string? selected = null;
            if (matches.Count > 0)
            {
                selected = matches.FirstOrDefault(m => string.Equals(m.Id, key, StringComparison.OrdinalIgnoreCase))?.Id
                           ?? matches[0].Id;
            }
            SymbolToIdCache[key] = selected;
            return selected;
        }

        private async Task EnsureCoinListLoadedAsync(CancellationToken cancellationToken)
        {
            if (_coinListCache is not null && DateTime.UtcNow - _coinListLoadedAt < TimeSpan.FromHours(24)) return;

            await CoinListLock.WaitAsync(cancellationToken);
            try
            {
                if (_coinListCache is not null && DateTime.UtcNow - _coinListLoadedAt < TimeSpan.FromHours(24)) return;

                var http = _httpClientFactory.CreateClient("CoinGecko");
                using var response = await http.GetAsync($"{BaseUrl}/coins/list", cancellationToken);
                response.EnsureSuccessStatusCode();
                var list = await response.Content.ReadFromJsonAsync<List<CoinListEntry>>(JsonOptions, cancellationToken);
                if (list is not null)
                {
                    _coinListCache = list;
                    _coinListLoadedAt = DateTime.UtcNow;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CoinGecko coin list load failed");
            }
            finally
            {
                CoinListLock.Release();
            }
        }

        public class CoinListEntry
        {
            public string Id { get; set; } = string.Empty;
            public string Symbol { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
        }
    }
}
