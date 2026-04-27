using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.Crypto;

namespace PFMP_API.Services.Crypto;

/// <summary>
/// Wave 13 Phase 4: Generates crypto-specific alerts —
/// expired/revoked exchange connections, single-asset concentration risk,
/// and stablecoin de-peg warnings.
/// </summary>
public interface ICryptoAlertService
{
    Task<List<Alert>> GenerateCryptoAlertsAsync(int userId, CancellationToken ct = default);
}

public class CryptoAlertService : ICryptoAlertService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CryptoAlertService> _logger;

    private const decimal ConcentrationThresholdPercent = 25m;
    private const decimal StablecoinDepegThresholdPercent = 2m; // |1.0 - price| > 2%

    private static readonly HashSet<string> Stablecoins = new(StringComparer.OrdinalIgnoreCase)
    {
        "USDT", "USDC", "DAI", "BUSD", "TUSD", "FRAX", "USDP", "GUSD", "USDD", "PYUSD"
    };

    public CryptoAlertService(ApplicationDbContext context, ILogger<CryptoAlertService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<Alert>> GenerateCryptoAlertsAsync(int userId, CancellationToken ct = default)
    {
        var produced = new List<Alert>();
        var connections = await _context.ExchangeConnections
            .Where(c => c.UserId == userId)
            .ToListAsync(ct);

        if (connections.Count == 0)
            return produced;

        // === 1) Connection health ===
        foreach (var conn in connections)
        {
            if (conn.Status == ExchangeConnectionStatus.Expired
                || conn.Status == ExchangeConnectionStatus.RevokedByUser
                || conn.Status == ExchangeConnectionStatus.Error)
            {
                var alert = await CreateOrUpdateAsync(userId, $"CryptoConnectionUnhealthy_{conn.ExchangeConnectionId}", () => new Alert
                {
                    Title = $"Crypto exchange '{conn.Provider}' needs attention",
                    Message = conn.Status switch
                    {
                        ExchangeConnectionStatus.Expired => $"The API key for {conn.Provider}{(string.IsNullOrEmpty(conn.Nickname) ? "" : $" ({conn.Nickname})")} has expired. Holdings, transactions, and tax-lot history will be stale until you re-link a fresh read-only key.",
                        ExchangeConnectionStatus.RevokedByUser => $"The API key for {conn.Provider}{(string.IsNullOrEmpty(conn.Nickname) ? "" : $" ({conn.Nickname})")} was revoked. Re-link to resume syncing.",
                        ExchangeConnectionStatus.Error => $"Repeated sync errors on {conn.Provider}{(string.IsNullOrEmpty(conn.Nickname) ? "" : $" ({conn.Nickname})")}. Last error: {conn.LastSyncError ?? "unknown"}",
                        _ => $"{conn.Provider} connection requires action."
                    },
                    Severity = conn.Status == ExchangeConnectionStatus.Error ? AlertSeverity.Medium : AlertSeverity.High,
                    Category = AlertCategory.Security,
                    IsActionable = true,
                    ActionUrl = "/dashboard/settings/crypto",
                    Metadata = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        AlertType = "CryptoConnectionUnhealthy",
                        ExchangeConnectionId = conn.ExchangeConnectionId,
                        Provider = conn.Provider,
                        Status = conn.Status.ToString(),
                    }),
                    PortfolioImpactScore = 60,
                });
                if (alert != null) produced.Add(alert);
            }
        }

        // === 2) Concentration & 3) De-peg ===
        var connIds = connections.Select(c => c.ExchangeConnectionId).ToList();
        var holdings = await _context.CryptoHoldings
            .Where(h => connIds.Contains(h.ExchangeConnectionId))
            .ToListAsync(ct);

        if (holdings.Count == 0)
            return produced;

        // Compute "total assets" for concentration baseline (cash + investments + crypto + properties).
        var cashTotal = await _context.CashAccounts.Where(c => c.UserId == userId).SumAsync(c => c.Balance, ct);
        var investmentAccountsTotal = await _context.InvestmentAccounts
            .Where(i => i.UserId == userId)
            .SumAsync(i => (decimal?)i.CurrentValue, ct) ?? 0m;
        var brokerageAccountIds = await _context.Accounts
            .Where(a => a.UserId == userId)
            .Select(a => a.AccountId)
            .ToListAsync(ct);
        var holdingsTotal = brokerageAccountIds.Count == 0
            ? 0m
            : await _context.Holdings
                .Where(h => brokerageAccountIds.Contains(h.AccountId))
                .SumAsync(h => (decimal?)h.CurrentValue, ct) ?? 0m;
        var propertyTotal = await _context.Properties
            .Where(p => p.UserId == userId)
            .SumAsync(p => (decimal?)p.EstimatedValue, ct) ?? 0m;
        var cryptoTotal = holdings.Sum(h => h.MarketValueUsd);
        var totalAssets = cashTotal + investmentAccountsTotal + holdingsTotal + propertyTotal + cryptoTotal;

        if (totalAssets > 0)
        {
            // Aggregate by symbol (sum staked + liquid)
            foreach (var group in holdings.GroupBy(h => h.Symbol, StringComparer.OrdinalIgnoreCase))
            {
                var symbol = group.Key;
                if (Stablecoins.Contains(symbol)) continue; // concentration check is for volatile assets
                var assetValue = group.Sum(h => h.MarketValueUsd);
                var pct = assetValue / totalAssets * 100m;
                if (pct >= ConcentrationThresholdPercent)
                {
                    var alert = await CreateOrUpdateAsync(userId, $"CryptoConcentration_{symbol.ToUpperInvariant()}", () => new Alert
                    {
                        Title = $"{symbol} is {pct:F0}% of your tracked assets",
                        Message = $"You have ${assetValue:N0} in {symbol} — about {pct:F1}% of your ${totalAssets:N0} tracked net worth. " +
                                  "Concentrated single-asset crypto positions can swing portfolio value materially. " +
                                  "Consider whether your allocation matches your risk tolerance.",
                        Severity = pct >= 40m ? AlertSeverity.High : AlertSeverity.Medium,
                        Category = AlertCategory.Portfolio,
                        IsActionable = false,
                        ActionUrl = "/dashboard/settings/crypto",
                        Metadata = System.Text.Json.JsonSerializer.Serialize(new
                        {
                            AlertType = "CryptoConcentration",
                            Symbol = symbol,
                            ValueUsd = assetValue,
                            PercentOfAssets = pct,
                        }),
                        PortfolioImpactScore = (int)Math.Min(95m, 50m + pct),
                    });
                    if (alert != null) produced.Add(alert);
                }
            }
        }

        // De-peg detection: any stablecoin holding with implied price (USD value / quantity) outside band
        foreach (var h in holdings.Where(h => Stablecoins.Contains(h.Symbol) && h.Quantity > 0))
        {
            var impliedPrice = h.MarketValueUsd / h.Quantity;
            var deviationPct = Math.Abs(impliedPrice - 1m) * 100m;
            if (deviationPct >= StablecoinDepegThresholdPercent)
            {
                var alert = await CreateOrUpdateAsync(userId, $"CryptoStablecoinDepeg_{h.Symbol.ToUpperInvariant()}_{h.ExchangeConnectionId}", () => new Alert
                {
                    Title = $"{h.Symbol} is trading off-peg ({impliedPrice:F4})",
                    Message = $"Your {h.Symbol} position is showing an implied price of ${impliedPrice:F4} — a {deviationPct:F2}% deviation from $1.00. " +
                              "Stablecoin de-pegs can be temporary (exchange outage, oracle lag) or signal genuine reserve issues. " +
                              "Verify on the issuer's transparency page before taking action.",
                    Severity = deviationPct >= 5m ? AlertSeverity.High : AlertSeverity.Medium,
                    Category = AlertCategory.Portfolio,
                    IsActionable = false,
                    ActionUrl = "/dashboard/settings/crypto",
                    Metadata = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        AlertType = "CryptoStablecoinDepeg",
                        Symbol = h.Symbol,
                        ExchangeConnectionId = h.ExchangeConnectionId,
                        ImpliedPriceUsd = impliedPrice,
                        DeviationPercent = deviationPct,
                    }),
                    PortfolioImpactScore = (int)Math.Min(85m, 40m + deviationPct * 4m),
                });
                if (alert != null) produced.Add(alert);
            }
        }

        if (produced.Count > 0)
            _logger.LogInformation("CryptoAlertService produced {Count} alerts for user {UserId}", produced.Count, userId);

        return produced;
    }

    /// <summary>
    /// Reuses an existing non-dismissed alert keyed by <paramref name="alertKey"/> within the last 24h to avoid duplicates;
    /// otherwise dismisses the stale one and inserts a fresh alert.
    /// </summary>
    private async Task<Alert?> CreateOrUpdateAsync(int userId, string alertKey, Func<Alert> factory)
    {
        var existing = await _context.Alerts
            .Where(a => a.UserId == userId
                && !a.IsDismissed
                && a.Metadata != null
                && a.Metadata.Contains($"\"AlertKey\":\"{alertKey}\""))
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (existing != null && (DateTime.UtcNow - existing.CreatedAt).TotalHours < 24)
            return null;

        if (existing != null)
        {
            existing.IsDismissed = true;
            existing.DismissedAt = DateTime.UtcNow;
        }

        var alert = factory();
        alert.UserId = userId;
        alert.CreatedAt = DateTime.UtcNow;

        // inject the AlertKey into the metadata so future runs can dedupe
        var dict = string.IsNullOrWhiteSpace(alert.Metadata)
            ? new Dictionary<string, object>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(alert.Metadata) ?? new();
        dict["AlertKey"] = alertKey;
        alert.Metadata = System.Text.Json.JsonSerializer.Serialize(dict);

        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();
        return alert;
    }
}
