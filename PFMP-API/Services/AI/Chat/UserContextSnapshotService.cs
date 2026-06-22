using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.AI;

namespace PFMP_API.Services.AI.Chat;

public class UserContextSnapshotService : IUserContextSnapshotService
{
    private readonly ApplicationDbContext _db;
    private readonly IAIIntelligenceService _intelligence;
    private readonly ILogger<UserContextSnapshotService> _logger;

    public UserContextSnapshotService(
        ApplicationDbContext db,
        IAIIntelligenceService intelligence,
        ILogger<UserContextSnapshotService> logger)
    {
        _db = db;
        _intelligence = intelligence;
        _logger = logger;
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
