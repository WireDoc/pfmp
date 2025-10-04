// Simple in-memory dev user selection state (no persistence) used for appending userId to API calls.
let currentDevUserId: number | null = null;
const listeners = new Set<() => void>();

export function setDevUserId(id: number) {
  currentDevUserId = id;
  listeners.forEach(l => l());
}

export function getDevUserId(): number | null {
  return currentDevUserId;
}

export function subscribeDevUser(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
