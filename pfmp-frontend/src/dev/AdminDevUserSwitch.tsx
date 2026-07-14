import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth/useAuth';
import { useDevUserId, setDevUserId } from './devUserState';
import { setImpersonatedUserId } from './adminImpersonation';
import { authFetch } from '../services/authToken';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5052/api';

interface DevUserInfo { userId: number; email: string; isDefault: boolean }
interface DevUsersResponse { users: DevUserInfo[] }

/**
 * Wave 26 Phase B — admin-only "switch to dev users" control (real-auth mode).
 *
 * Unlike the simulated-mode DevUserSwitcher, this does NOT mint tokens: the
 * admin's Entra token stays the bearer for every request, and the backend's
 * ownership filter lets admins act on any userId. Switching just re-points
 * the current-user store, so all views re-resolve against the picked user.
 */
export function AdminDevUserSwitch() {
  const { isDev, isAdmin, realUserId } = useAuth();
  const activeUserId = useDevUserId();
  const [users, setUsers] = useState<DevUserInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const impersonating = realUserId != null && activeUserId != null && activeUserId !== realUserId;
  const enabled = !isDev && isAdmin && realUserId != null;

  const load = useCallback(async () => {
    try {
      const resp = await authFetch(`${API_BASE}/dev/users`);
      if (!resp.ok) {
        // 404 outside Development — nothing to switch to.
        setUsers([]);
        return;
      }
      const data = await resp.json() as DevUsersResponse;
      setUsers(data.users.filter(u => u.userId !== realUserId));
    } catch {
      setError('Dev users unavailable');
      setUsers([]);
    }
  }, [realUserId]);

  useEffect(() => {
    if (enabled && users === null) void load();
  }, [enabled, users, load]);

  if (!enabled) return null;

  const switchTo = (id: number | null) => {
    setImpersonatedUserId(id);
    setDevUserId(id ?? realUserId);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <label htmlFor="admin-dev-user-switch" style={{ fontSize: 11, color: '#94a3b8' }}>
        View as
      </label>
      <select
        id="admin-dev-user-switch"
        value={impersonating ? String(activeUserId) : ''}
        onChange={(e) => switchTo(e.target.value === '' ? null : Number(e.target.value))}
        style={{
          background: '#1e293b',
          color: '#e2e8f0',
          border: '1px solid #475569',
          borderRadius: 4,
          fontSize: 11,
          padding: '2px 4px',
          cursor: 'pointer',
        }}
      >
        <option value="">My account ({realUserId})</option>
        {(users ?? []).map(u => (
          <option key={u.userId} value={u.userId}>
            {u.userId} — {u.email}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: 10, color: '#f87171' }}>{error}</span>}
    </span>
  );
}
