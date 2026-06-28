/**
 * Wave 25 Phase C — module-level access-token holder.
 *
 * Both axios (REST) and fetch (the chat SSE stream) need the same Bearer token
 * but they're called from disparate places. Using a module-level singleton with
 * getter/setter avoids passing the token through every layer.
 *
 * Owner: AuthProvider. Updated in two scenarios:
 *   1. Simulated-auth mode — when the dev user is set or switched,
 *      AuthProvider mints a dev JWT via POST /auth/dev-login and stores it here.
 *   2. Real-MSAL mode — when MSAL acquires an Entra access token for the
 *      PFMP API scope, AuthProvider stores it here.
 *
 * The token may be null during the brief moment between dev-user-selected and
 * dev-login-completed; callers should tolerate that (the request will 401 and
 * the user can retry, or we can queue requests during the mint — kept simple
 * for v1).
 */

let currentToken: string | null = null;
let currentExpiresAt: Date | null = null;

const listeners = new Set<() => void>();

export function setAuthToken(token: string | null, expiresAt?: Date | null) {
  currentToken = token;
  currentExpiresAt = expiresAt ?? null;
  listeners.forEach(l => l());
}

export function getAuthToken(): string | null {
  // Treat expired tokens as absent so callers don't send them and 401 noisily.
  if (currentExpiresAt && currentExpiresAt.getTime() < Date.now()) {
    return null;
  }
  return currentToken;
}

export function clearAuthToken() {
  setAuthToken(null, null);
}

export function subscribeAuthToken(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Convenience for components that want to re-render when the token changes. */
export function getAuthTokenSnapshot(): { token: string | null; expiresAt: Date | null } {
  return { token: currentToken, expiresAt: currentExpiresAt };
}

/**
 * Drop-in replacement for window.fetch that auto-injects Authorization: Bearer
 * when a token is available. Use for any service that calls fetch() directly
 * (the chat SSE stream, dashboard summary, etc. — places where axios's
 * apiClient interceptor doesn't reach). For axios callers, the request
 * interceptor in services/api.ts already handles this.
 *
 * Signature matches window.fetch so it can be swapped in line-for-line.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  if (!token) {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
