using System.Collections.Concurrent;

namespace PFMP_API.Services;

/// <summary>
/// In-memory registry (dev only) tracking seeded test users and a chosen default test user id.
/// Not persisted; rebuilt each startup.
/// </summary>
public static class DevUserRegistry
{
    private static readonly ConcurrentDictionary<int, string> _users = new();
    public static int DefaultTestUserId { get; private set; } = 1;

    public static void Register(int userId, string email)
    {
        _users[userId] = email;
    }

    public static void SetDefault(int userId)
    {
        DefaultTestUserId = userId;
    }

    public static IReadOnlyDictionary<int, string> GetAll() => _users;
}
