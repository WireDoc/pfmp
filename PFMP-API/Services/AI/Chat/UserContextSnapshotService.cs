using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models.AI;

namespace PFMP_API.Services.AI.Chat;

public class UserContextSnapshotService : IUserContextSnapshotService
{
    private readonly ApplicationDbContext _db;
    private readonly IAIIntelligenceService _intelligence;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<UserContextSnapshotService> _logger;

    public UserContextSnapshotService(
        ApplicationDbContext db,
        IAIIntelligenceService intelligence,
        IOptions<OpenRouterOptions> options,
        ILogger<UserContextSnapshotService> logger)
    {
        _db = db;
        _intelligence = intelligence;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<UserContextSnapshot> GetCurrentSnapshotAsync(int userId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var existing = await _db.UserContextSnapshots
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SnapshotDate == today, ct);

        // Nothing for today yet — full build.
        if (existing == null)
        {
            _logger.LogDebug("Snapshot smart-check (user {UserId}): no row for today, building", userId);
            return await ForceRebuildAsync(userId, ct);
        }

        // Hard max-age safety net (catches global tables not in the per-user watermark).
        var maxAge = TimeSpan.FromMinutes(_options.Chat.SnapshotMaxAgeMinutes);
        var age = DateTime.UtcNow - existing.UpdatedAt;
        if (age > maxAge)
        {
            _logger.LogInformation(
                "Snapshot smart-check (user {UserId}): age {Age:F0}min exceeds max {Max:F0}min, rebuilding",
                userId, age.TotalMinutes, maxAge.TotalMinutes);
            return await ForceRebuildAsync(userId, ct);
        }

        // Source-change watermark: did anything in the user's profile / accounts /
        // holdings / news / advice etc. update after the snapshot was built?
        var sourceLatest = await ComputeSourceLatestUpdateAsync(userId, ct);
        if (sourceLatest > existing.UpdatedAt)
        {
            _logger.LogInformation(
                "Snapshot smart-check (user {UserId}): source updated at {Source:O}, snapshot at {Snap:O}, rebuilding",
                userId, sourceLatest, existing.UpdatedAt);
            return await ForceRebuildAsync(userId, ct);
        }

        // Fresh enough.
        return existing;
    }

    /// <summary>
    /// One round-trip Postgres query returning the most recent UpdatedAt/CreatedAt/
    /// GeneratedAt/LastSyncedAt across all chat-context source tables for the user.
    /// Each subquery hits a per-user index, so total time is well under 50ms even
    /// on a populated install. COALESCE('epoch') protects against empty tables.
    /// </summary>
    private async Task<DateTime> ComputeSourceLatestUpdateAsync(int userId, CancellationToken ct)
    {
        FormattableString sql = $"""
SELECT GREATEST(
    COALESCE((SELECT MAX("UpdatedAt") FROM "Users" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "Accounts" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "CashAccounts" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "InvestmentAccounts" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "Properties" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "TspLifecyclePositions" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "UserNotes" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FederalBenefitsProfiles" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "EstatePlanningProfiles" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileInsurancePolicies" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileBenefitCoverages" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileEquityInterest" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileExpenses" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileLiabilities" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileLongTermObligations" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "FinancialProfileTaxProfiles" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "IncomeStreams" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("UpdatedAt") FROM "Advice" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(h."UpdatedAt") FROM "Holdings" h INNER JOIN "Accounts" a ON h."AccountId" = a."AccountId" WHERE a."UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("CreatedAt") FROM "Alerts" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("CreatedAt") FROM "NetWorthSnapshots" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("GeneratedAt") FROM "NewsDigests" WHERE "UserId" = {userId}), 'epoch'::timestamptz),
    COALESCE((SELECT MAX("LastSyncedAt") FROM "AccountConnections" WHERE "UserId" = {userId}), 'epoch'::timestamptz)
) AS "Value"
""";
        var result = await _db.Database.SqlQuery<DateTime>(sql).FirstAsync(ct);
        return result;
    }

    public async Task<UserContextSnapshot> GetOrCreateTodaySnapshotAsync(int userId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var existing = await _db.UserContextSnapshots
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SnapshotDate == today, ct);
        if (existing != null) return existing;

        // No snapshot for today — build one. We assemble outside any transaction
        // because the builder reads dozens of tables and can take a few seconds.
        var content = await _intelligence.BuildCacheableContextAsync(userId);
        var hash = Sha256Hex(content);
        var tokens = EstimateTokens(content);

        var snapshot = new UserContextSnapshot
        {
            UserId = userId,
            SnapshotDate = today,
            ContentHash = hash,
            Content = content,
            EstimatedTokens = tokens,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.UserContextSnapshots.Add(snapshot);

        try
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation(
                "Created daily context snapshot for user {UserId}: {Tokens} tokens, hash {Hash}",
                userId, tokens, hash[..12]);
        }
        catch (DbUpdateException)
        {
            // Race: another request just created the same-day row. Re-fetch and use that one.
            _db.UserContextSnapshots.Entry(snapshot).State = EntityState.Detached;
            existing = await _db.UserContextSnapshots
                .FirstOrDefaultAsync(s => s.UserId == userId && s.SnapshotDate == today, ct);
            if (existing == null) throw;
            return existing;
        }

        return snapshot;
    }

    public async Task<UserContextSnapshot> ForceRebuildAsync(int userId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var content = await _intelligence.BuildCacheableContextAsync(userId);
        var hash = Sha256Hex(content);

        var existing = await _db.UserContextSnapshots
            .FirstOrDefaultAsync(s => s.UserId == userId && s.SnapshotDate == today, ct);

        if (existing != null && existing.ContentHash == hash)
        {
            _logger.LogInformation(
                "Snapshot rebuild for user {UserId}: content unchanged (hash {Hash}), keeping existing row",
                userId, hash[..12]);
            return existing;
        }

        var tokens = EstimateTokens(content);

        if (existing == null)
        {
            existing = new UserContextSnapshot
            {
                UserId = userId,
                SnapshotDate = today,
                ContentHash = hash,
                Content = content,
                EstimatedTokens = tokens,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.UserContextSnapshots.Add(existing);
        }
        else
        {
            existing.Content = content;
            existing.ContentHash = hash;
            existing.EstimatedTokens = tokens;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Rebuilt context snapshot for user {UserId}: {Tokens} tokens, new hash {Hash}",
            userId, tokens, hash[..12]);

        return existing;
    }

    /// <summary>
    /// Rule-of-thumb: ~4 chars per token for English text. Good enough for cost
    /// projections in the UI; the authoritative count comes from OpenRouter's
    /// usage block after the call.
    /// </summary>
    private static int EstimateTokens(string content) => content.Length / 4;

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var sb = new StringBuilder(64);
        foreach (var b in bytes) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }
}
