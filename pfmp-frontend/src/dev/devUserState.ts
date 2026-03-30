import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pfmp_dev_user_id';

// Rehydrate from localStorage so the dev user survives page refreshes and direct URL navigation.
function readPersistedId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch { /* SSR / restricted storage */ }
  return null;
}

let currentDevUserId: number | null = readPersistedId();

/** True once setDevUserId has been called at least once (i.e. DevUserSwitcher has loaded). */
let initialized = false;

const listeners = new Set<() => void>();

export function setDevUserId(id: number | null) {
  currentDevUserId = id;
  initialized = true;
  try {
    if (id !== null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* restricted storage */ }
  listeners.forEach(l => l());
}

export function getDevUserId(): number | null {
  return currentDevUserId;
}

const IS_TEST = import.meta.env.MODE === 'test';

/** Whether the dev user store has been explicitly initialized (via DevUserSwitcher or localStorage). */
export function isDevUserReady(): boolean {
  // In test mode, tests manage their own user state — no DevUserSwitcher needed.
  return IS_TEST || initialized || currentDevUserId !== null;
}

export function subscribeDevUser(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentDevUserId;
}

export function useDevUserId(): number | null {
  return useSyncExternalStore(subscribeDevUser, getSnapshot, getSnapshot);
}

export function useDevUserReady(): boolean {
  const ready = useSyncExternalStore(
    subscribeDevUser,
    () => IS_TEST || initialized || currentDevUserId !== null,
    () => IS_TEST || initialized || currentDevUserId !== null,
  );
  return ready;
}
