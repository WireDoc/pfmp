using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P3: generates Alert rows for new <see cref="SpendingAnomaly"/>
/// rows that haven't surfaced as alerts yet. Single alert family
/// (<c>SpendingAnomaly</c>) with 24h dedup keyed on
/// <c>(UserId, CashTransactionId)</c>. Severity High when deviation ≥ 4× IQR,
/// Medium otherwise. Mirrors the <see cref="Services.Crypto.CryptoAlertService"/>
/// dedup pattern (AlertKey lives inside the JSON metadata).
/// </summary>
public interface ISpendingAlertService
{
    Task<List<Alert>> GenerateAnomalyAlertsAsync(int userId, CancellationToken ct = default);
}

public class SpendingAlertService : ISpendingAlertService
{
    private const decimal HighSeverityDeviation = 4m;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<SpendingAlertService> _logger;

    public SpendingAlertService(ApplicationDbContext db, ILogger<SpendingAlertService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<Alert>> GenerateAnomalyAlertsAsync(int userId, CancellationToken ct = default)
    {
        var produced = new List<Alert>();

        var recentAnomalies = await _db.SpendingAnomalies
            .Where(a => a.UserId == userId && !a.Dismissed)
            .OrderByDescending(a => a.DetectedAt)
            .Take(20)
            .Join(_db.CashTransactions, a => a.CashTransactionId, t => t.CashTransactionId,
                (a, t) => new { Anomaly = a, Tx = t })
            .ToListAsync(ct);

        foreach (var pair in recentAnomalies)
        {
            var a = pair.Anomaly;
            var tx = pair.Tx;
            var alertKey = $"SpendingAnomaly_{a.CashTransactionId}";
            var severity = a.DeviationMultiple >= HighSeverityDeviation
                ? AlertSeverity.High
                : AlertSeverity.Medium;

            var alert = await CreateOrUpdateAsync(userId, alertKey, () => new Alert
            {
                Title = $"Unusual {a.PlaidPrimaryCategory.Replace('_', ' ').ToLowerInvariant()} expense",
                Message = $"A ${a.Amount:N2} transaction ({tx.Merchant ?? "no merchant"}, {tx.TransactionDate:yyyy-MM-dd}) is "
                          + $"{a.DeviationMultiple:N1}× outside the typical range for this category "
                          + $"(median ${a.CategoryMedian:N2}, IQR ${a.CategoryIqr:N2}).",
                Severity = severity,
                Category = AlertCategory.Spending,
                IsActionable = true,
                ActionUrl = "/dashboard/spending",
                Metadata = System.Text.Json.JsonSerializer.Serialize(new
                {
                    AlertType = "SpendingAnomaly",
                    AnomalyId = a.AnomalyId,
                    CashTransactionId = a.CashTransactionId,
                    PlaidPrimaryCategory = a.PlaidPrimaryCategory,
                    Amount = a.Amount,
                    CategoryMedian = a.CategoryMedian,
                    CategoryIqr = a.CategoryIqr,
                    DeviationMultiple = a.DeviationMultiple,
                }),
                PortfolioImpactScore = severity == AlertSeverity.High ? 50 : 30,
            });
            if (alert != null) produced.Add(alert);
        }

        if (produced.Count > 0)
        {
            _logger.LogInformation("SpendingAlertService produced {Count} anomaly alerts for user {UserId}", produced.Count, userId);
        }
        return produced;
    }

    /// <summary>
    /// 24h dedup: a non-dismissed alert with the same AlertKey within the last
    /// 24 hours suppresses a new emit; older alerts get dismissed and replaced.
    /// </summary>
    private async Task<Alert?> CreateOrUpdateAsync(int userId, string alertKey, Func<Alert> factory)
    {
        var existing = await _db.Alerts
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

        var dict = string.IsNullOrWhiteSpace(alert.Metadata)
            ? new Dictionary<string, object>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(alert.Metadata) ?? new();
        dict["AlertKey"] = alertKey;
        alert.Metadata = System.Text.Json.JsonSerializer.Serialize(dict);

        _db.Alerts.Add(alert);
        await _db.SaveChangesAsync();
        return alert;
    }
}
