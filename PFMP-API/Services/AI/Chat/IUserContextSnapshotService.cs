using PFMP_API.Models.AI;

namespace PFMP_API.Services.AI.Chat;

/// <summary>
/// Wave 24 — Manages the per-user daily context snapshot that becomes the
/// cacheable prompt prefix for chat messages. One row per (UserId, SnapshotDate).
///
/// Why: chat history is replayed in full on every request; the user-profile +
/// holdings + news context blob is ~8-15k tokens. By sending byte-identical
/// content across messages on the same day, the OpenRouter / provider prompt
/// cache returns ~90% input-cost discount on cache hits.
/// </summary>
public interface IUserContextSnapshotService
{
    /// <summary>
    /// Always-fresh path: returns today's snapshot, auto-rebuilding when stale.
    /// Staleness fires on either (a) any chat-context source table has a newer
    /// MAX(UpdatedAt) than the snapshot's UpdatedAt, or (b) the snapshot is
    /// older than Chat:SnapshotMaxAgeMinutes regardless. Use this on the hot
    /// chat path — the watermark query is one round-trip (~30ms) and rebuilds
    /// only happen when the content actually differs (hash-compared).
    /// </summary>
    Task<UserContextSnapshot> GetCurrentSnapshotAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Returns today's snapshot for the user, building one on first call of the day.
    /// Does NOT detect mid-day source changes — use <see cref="GetCurrentSnapshotAsync"/>
    /// for the smart-refresh path. Kept for callers that explicitly want the cached
    /// daily snapshot (e.g. background jobs that don't need per-second freshness).
    /// </summary>
    Task<UserContextSnapshot> GetOrCreateTodaySnapshotAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Force-rebuilds today's snapshot from current user data. Only writes back to
    /// the DB if the rebuilt content's SHA-256 differs from the existing snapshot —
    /// keeps the provider cache warm when nothing actually changed. Returns the
    /// (possibly unchanged) snapshot row.
    /// </summary>
    Task<UserContextSnapshot> ForceRebuildAsync(int userId, CancellationToken ct = default);
}
