import { useEffect, useRef } from 'react';
import { getDevUserId, setDevUserId, isDevUserReady } from './devUserState';

interface DevUserInfo { userId: number; email: string; isDefault: boolean; }
interface DevUsersResponse { users: DevUserInfo[] }

/**
 * Lightweight hook that ensures the dev user store is initialized as early as possible.
 * If localStorage already has a persisted user ID, the store is ready synchronously.
 * Otherwise, fetches /api/dev/users to find the default and calls setDevUserId().
 *
 * This hook is mounted in AppLayout (above all guards) so that DashboardGuard and
 * RootGuard can wait for dev user readiness without deadlocking.
 */
export function useDevUserInit() {
  const fetched = useRef(false);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;

    // Already ready from localStorage — no fetch needed, but still sync from API
    // to ensure the server-side default stays in sync.
    if (fetched.current) return;
    fetched.current = true;

    // If we already have a persisted ID, the guards can proceed immediately.
    // Still fetch in the background to keep the server-side default in sync.
    (async () => {
      try {
        const resp = await fetch('/api/dev/users');
        if (!resp.ok) return;
        const data = (await resp.json()) as DevUsersResponse;
        const def = data.users.find((u) => u.isDefault);
        // Only override if the store hasn't been explicitly set yet (i.e. no localStorage value).
        if (!isDevUserReady()) {
          setDevUserId(def?.userId ?? null);
        }
      } catch {
        // If the API is unavailable and there's no persisted ID, fall back to user 1
        // so the app doesn't spin indefinitely.
        if (!isDevUserReady()) {
          setDevUserId(getDevUserId() ?? 1);
        }
      }
    })();
  }, []);
}
