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

import axios from 'axios';

let currentToken: string | null = null;
let currentExpiresAt: Date | null = null;

const listeners = new Set<() => void>();

// ----- Phase D regression cleanup: global fetch monkey-patch ----------------
// A surprising number of services + view components call window.fetch() directly
// instead of going through the axios apiClient (which has the request interceptor).
// After Phase D added [Authorize] to every controller, every one of those direct
// calls 401s. Rather than chase down each call-site (multiple sweeps missed
// some), we monkey-patch window.fetch ONCE at module load to inject Authorization
// when the request targets our own API. External hosts (Microsoft Graph, RSS
// feeds, etc.) are left untouched.
//
// Idempotent: re-evaluating this module (e.g. Vite HMR) re-uses the same
// originalFetch reference so we don't end up double-wrapping.

declare global {
  interface Window { __pfmpFetchPatched?: boolean; __pfmpOriginalFetch?: typeof fetch }
}

if (typeof window !== 'undefined' && !window.__pfmpFetchPatched) {
  const original = window.fetch.bind(window);
  window.__pfmpOriginalFetch = original;
  window.__pfmpFetchPatched = true;

  window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Resolve target URL to a string for prefix checking. Avoids relying on
    // Request/URL instance methods inside hot paths.
    let url: string;
    if (typeof input === 'string') url = input;
    else if (input instanceof URL) url = input.toString();
    else url = input.url;

    // Match on the URL's PATH segment (not raw string prefix) so we catch
    // both the direct-to-backend form ("http://localhost:5052/api/...") and
    // the same-origin form Vite's proxy uses ("http://localhost:3000/api/...")
    // and plain relative paths ("/api/..."). Any non-parseable URL falls
    // through as external.
    let pathname = '';
    try {
      pathname = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined).pathname;
    } catch {
      pathname = url;
    }
    const targetsOurApi = pathname.startsWith('/api/');

    if (!targetsOurApi) {
      return original(input, init);
    }

    // Critical: exempt the auth endpoints themselves from whenAuthReady.
    // /api/auth/dev-login + /api/auth/login PRODUCE tokens; making them wait
    // for a token creates a deadlock — they sit in whenAuthReady for 2s
    // until it times out, by which point every other concurrent request
    // has ALSO timed out and gone over the wire without auth → 401s.
    // /api/auth/me is [Authorize] so it does need a token — not exempted.
    const isAuthMint =
      url.includes('/auth/dev-login') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (!isAuthMint) {
      await whenAuthReady();
    }

    const token = currentToken;
    if (!token) {
      return original(input, init);
    }
    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return original(input, { ...init, headers });
  };
}
// ----- end monkey-patch -----------------------------------------------------

// ----- axios auth interceptor (shared) ---------------------------------------
// Attach to any axios instance so requests aimed at our API carry the Bearer
// token. Waits on whenAuthReady() to close the first-request race. Interceptors
// don't propagate between the default axios instance and axios.create()
// instances, so every instance needs this called on it once.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function attachAuthInterceptor(instance: { interceptors: { request: { use: (fn: (config: any) => Promise<any>) => void } } }): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance.interceptors.request.use(async (config: any) => {
    const rawUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
    let pathname = '';
    try {
      pathname = new URL(rawUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost').pathname;
    } catch {
      pathname = rawUrl;
    }
    if (!pathname.startsWith('/api/')) return config;

    await whenAuthReady();
    const token = getAuthToken();
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` };
      }
    }
    return config;
  });
}

// Cover the DEFAULT axios instance — several services call axios.get(...)
// directly (accountsApi, cashAccountsApi, plaidApi, AccountsPanel). axios uses
// XHR in browsers, so the fetch monkey-patch above never sees these requests.
// This module is imported first by main.tsx, so the interceptor lands before
// any component code runs.
attachAuthInterceptor(axios);
// ----- end axios auth interceptor ---------------------------------------------

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
 * Wait until a token is available, or until the timeout elapses (whichever comes
 * first). Used by the axios interceptor + authFetch so that the very first
 * outbound request after a page load doesn't race against the AuthProvider's
 * dev-token mint (which is async).
 *
 * Returns immediately if a non-null token is already set. Resolves silently on
 * timeout — callers should still check `getAuthToken()` afterward and proceed
 * without auth if it's still null (some endpoints are public).
 */
export function whenAuthReady(timeoutMs = 2000): Promise<void> {
  if (currentToken) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup: (() => void) | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      if (cleanup) cleanup();
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    // Subscribe FIRST, then re-check — closes the race where the mint
    // completes between the initial check and the subscribe call. Without
    // this, we'd register a subscriber after the event fired and wait
    // through the full timeout before proceeding without auth.
    cleanup = subscribeAuthToken(() => {
      if (currentToken) finish();
    });
    if (currentToken) {
      finish();
      return;
    }
    timer = setTimeout(finish, timeoutMs);
  });
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
  await whenAuthReady();
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
