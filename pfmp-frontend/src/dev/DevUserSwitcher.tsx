import React, { useCallback, useEffect, useState } from 'react';
import { setDevUserId } from './devUserState';

interface DevUserInfo { userId: number; email: string; isDefault: boolean; }

interface DevUsersResponse { users: DevUserInfo[] }

export const DevUserSwitcher: React.FC = () => {
  const isTestMode = import.meta.env.MODE === 'test';
  const [users, setUsers] = useState<DevUserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/dev/users');
      if (!resp.ok) throw new Error('Failed to fetch dev users');
      const data = await resp.json() as DevUsersResponse;
      setUsers(data.users);
      const def = data.users.find((u) => u.isDefault);
      setDevUserId(def?.userId ?? null);
    } catch (rawError: unknown) {
      if (rawError instanceof Error) {
        setError(rawError.message);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTestMode) {
      return;
    }
    void load();
  }, [isTestMode, load]);

  async function setDefault(userId: number) {
    await fetch(`/api/dev/users/default/${userId}`, { method: 'POST' });
    setDevUserId(userId);
    await load();
  }

  async function resetUser(userId: number) {
    await fetch(`/api/onboarding/progress/reset?userId=${userId}`, { method: 'POST' });
    setDevUserId(userId);
    // No explicit confirmation; re-hydration occurs on next GET by context
  }

  if (isTestMode) {
    // Skip dev user orchestration during Vitest runs to avoid network noise
    // and act() warnings triggered by async state updates.
    return null;
  }

  return (
    <div style={{ padding: '0.5rem', border: '1px dashed #888', marginBottom: '1rem' }}>
      <strong>Dev User Switcher</strong>{' '}
      {loading && <span>Loading...</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}
      {!loading && users.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {users.map(u => (
            <div key={u.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={() => setDefault(u.userId)}
                style={{
                  padding: '0.4rem 0.6rem',
                  background: u.isDefault ? '#2563eb' : '#e0e0e0',
                  color: u.isDefault ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  minWidth: 44
                }}
                title={u.email}
              >
                {u.userId}
              </button>
              <button
                onClick={() => resetUser(u.userId)}
                style={{ marginTop: 4, background: '#f3f3f3', border: '1px solid #bbb', fontSize: 10, cursor: 'pointer' }}
              >reset</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
        Selecting a user updates backend default (and local) for subsequent onboarding calls. Use reset to clear progress.
      </div>
    </div>
  );
};
