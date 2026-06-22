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
    /// Returns today's snapshot for the user, building one on first call of the day.
    /// Subsequent calls within the same UTC date return the cached row unchanged
    /// (so the bytes sent to the LLM stay identical and cache hits accrue).
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
