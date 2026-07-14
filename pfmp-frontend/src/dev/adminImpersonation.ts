/**
 * Wave 26 Phase B — admin "switch to dev users" persistence.
 *
 * In real-auth mode an admin can view the app as a dev user WITHOUT ending
 * their MSAL session: the bearer token stays the admin's Entra token (the
 * backend's ownership filter exempts admins), and only the current-user store
 * (devUserState) is re-pointed at the dev user's id. This module remembers
 * that choice across reloads so AuthProvider can restore it after /auth/me.
 */

const STORAGE_KEY = 'pfmp_admin_impersonate_user_id';

export function getImpersonatedUserId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch { /* restricted storage */ }
  return null;
}

export function setImpersonatedUserId(id: number | null) {
  try {
    if (id !== null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* restricted storage */ }
}
