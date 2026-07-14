import React, { useEffect, useState } from 'react';
import { useFeatureFlag } from '../../flags/featureFlags';
// Using only msal-browser to avoid peer dependency mismatch of @azure/msal-react with React 19.
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import type { AccountInfo, SilentRequest } from '@azure/msal-browser';
import { msalConfig, loginRequest, pfmpApiScopes } from '../../config/authConfig';
import { AuthContext } from './AuthContextObject';
import { msalInstance } from './msalInstance';
import { SIMULATED_USERS } from './simulatedUsers';
import type { AuthContextType, AuthProviderProps } from './types';
import { setAuthToken, clearAuthToken, getAuthToken, authFetch } from '../../services/authToken';
import { getDevUserId, setDevUserId, subscribeDevUser } from '../../dev/devUserState';
import { getImpersonatedUserId, setImpersonatedUserId } from '../../dev/adminImpersonation';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5052/api';

// Proactive renewal timers — one per auth mode, both re-arming ~5 minutes
// before the current token expires so a tab left open past the token lifetime
// doesn't start 401ing (previously required a manual hard refresh).
let devTokenRenewTimer: ReturnType<typeof setTimeout> | undefined;
let entraTokenRenewTimer: ReturnType<typeof setTimeout> | undefined;

function clearRenewTimers() {
    if (devTokenRenewTimer) { clearTimeout(devTokenRenewTimer); devTokenRenewTimer = undefined; }
    if (entraTokenRenewTimer) { clearTimeout(entraTokenRenewTimer); entraTokenRenewTimer = undefined; }
}

/**
 * Wave 25 Phase C — fetches a dev JWT for the given dev-user id and stores it
 * in the shared authToken module so axios + fetch attach it automatically.
 * Idempotent within a single dev user id; safe to call multiple times.
 * Schedules its own renewal before expiry.
 */
async function mintDevToken(userId: number): Promise<boolean> {
    try {
        const resp = await fetch(`${API_BASE}/auth/dev-login?userId=${userId}`, { method: 'POST' });
        if (!resp.ok) {
            console.warn('Dev login failed:', resp.status, await resp.text().catch(() => ''));
            clearAuthToken();
            return false;
        }
        const data = await resp.json() as { accessToken: string; expiresAtUtc: string };
        const expiresAt = new Date(data.expiresAtUtc);
        setAuthToken(data.accessToken, expiresAt);

        // Chain the next renewal. If the tab sleeps past expiry, the timer fires
        // on wake and re-mints immediately (floor of 15s guards against tight loops
        // when the clock says we're already past the renewal point).
        if (devTokenRenewTimer) clearTimeout(devTokenRenewTimer);
        const renewInMs = Math.max(15_000, expiresAt.getTime() - Date.now() - 5 * 60_000);
        devTokenRenewTimer = setTimeout(() => { void mintDevToken(userId); }, renewInMs);
        return true;
    } catch (err) {
        console.warn('Dev login error:', err);
        clearAuthToken();
        return false;
    }
}

/**
 * Wave 25 Phase E — acquires an Entra access token for the PFMP API scope and
 * stores it in the shared authToken module (same pipe the dev tokens use).
 * Schedules a silent renewal ~5 minutes before expiry; MSAL's own cache/refresh
 * token machinery does the heavy lifting under the hood.
 */
async function acquireEntraApiToken(account: AccountInfo): Promise<boolean> {
    try {
        const silentRequest: SilentRequest = { scopes: pfmpApiScopes.read, account };
        const result = await msalInstance.acquireTokenSilent(silentRequest);
        const expiresAt = result.expiresOn ?? new Date(Date.now() + 55 * 60_000);
        setAuthToken(result.accessToken, expiresAt);

        if (entraTokenRenewTimer) clearTimeout(entraTokenRenewTimer);
        const renewInMs = Math.max(15_000, expiresAt.getTime() - Date.now() - 5 * 60_000);
        entraTokenRenewTimer = setTimeout(() => { void acquireEntraApiToken(account); }, renewInMs);
        return true;
    } catch (err) {
        // InteractionRequired means the refresh token is gone/expired — the user
        // has to sign in again interactively. Anything else is unexpected.
        if (err instanceof InteractionRequiredAuthError) {
            console.warn('Entra silent token acquisition requires interaction; user must sign in again.');
        } else {
            console.error('Entra token acquisition failed:', err);
        }
        clearAuthToken();
        return false;
    }
}

interface MeResponse { userId: number; email: string | null; firstName: string | null; lastName: string | null; isSetupComplete: boolean; isAdmin: boolean }
type MeResult = { ok: true; me: MeResponse } | { ok: false; status: number; message: string };

/**
 * Wave 25 Phase E — resolves the PFMP user for the current bearer token via
 * /auth/me. On the very first real login this PROVISIONS the user row
 * (allowlist-gated server-side). The returned userId is pushed into the
 * current-user store (devUserState) so the ~40 views that resolve their
 * userId from it keep working unchanged in real-auth mode.
 */
async function resolveCurrentUser(): Promise<MeResult> {
    try {
        const resp = await authFetch(`${API_BASE}/auth/me`);
        if (!resp.ok) {
            let message = `Sign-in rejected (${resp.status})`;
            try {
                const body = await resp.json() as { message?: string };
                if (body?.message) message = body.message;
            } catch { /* non-JSON body */ }
            return { ok: false, status: resp.status, message };
        }
        const me = await resp.json() as MeResponse;
        return { ok: true, me };
    } catch (err) {
        console.error('/auth/me failed:', err);
        return { ok: false, status: 0, message: 'Could not reach the PFMP API' };
    }
}

type RealInitOutcome =
    | { status: 'signed-out' }
    | { status: 'ok'; account: AccountInfo; me: MeResponse }
    | { status: 'rejected'; message: string };

// Deduped real-mode initialization. React StrictMode double-mounts the provider,
// firing two init effects near-simultaneously; without this guard both chains
// would run handleRedirectPromise → acquireToken → /auth/me concurrently, and
// the FIRST-EVER login could provision two user rows (the backend's
// check-then-insert has a unique index as backstop, but don't invite the race).
let realInitInFlight: Promise<RealInitOutcome> | null = null;

function initializeRealAuth(): Promise<RealInitOutcome> {
    if (!realInitInFlight) {
        realInitInFlight = (async (): Promise<RealInitOutcome> => {
            try {
                await msalInstance.initialize();
                // Completes a loginRedirect round-trip if we just came back from
                // Microsoft (auth code in the URL fragment); null otherwise.
                const response = await msalInstance.handleRedirectPromise();
                const account = response?.account ?? msalInstance.getAllAccounts()[0] ?? null;
                if (!account) {
                    // Signed out — ProtectedRoute sends the user to /login.
                    return { status: 'signed-out' };
                }
                msalInstance.setActiveAccount(account);

                const gotToken = await acquireEntraApiToken(account);
                if (!gotToken) {
                    // Refresh token expired — interactive sign-in needed again.
                    return { status: 'signed-out' };
                }

                const me = await resolveCurrentUser();
                if (!me.ok) {
                    // 403 = not on the allowlist / inactive; surface the server's
                    // reason on the login page and stay signed out app-side.
                    clearAuthToken();
                    clearRenewTimers();
                    return { status: 'rejected', message: me.message };
                }

                // Repoint the current-user store. Wave 26: an admin with a
                // persisted dev-user impersonation resumes viewing as that
                // user (their own Entra token stays the bearer — the backend
                // ownership filter exempts admins). Everyone else lands on
                // their own userId; stale impersonation state for non-admins
                // is cleared defensively.
                if (!me.me.isAdmin) {
                    setImpersonatedUserId(null);
                }
                const impersonated = me.me.isAdmin ? getImpersonatedUserId() : null;
                const effectiveUserId = impersonated ?? me.me.userId;
                if (getDevUserId() !== effectiveUserId) {
                    setDevUserId(effectiveUserId);
                }
                return { status: 'ok', account, me: me.me };
            } finally {
                // Allow future re-inits (e.g. simulated-auth flag flipped off later).
                realInitInFlight = null;
            }
        })();
    }
    return realInitInFlight;
}

// AuthContext now defined in AuthContextObject.ts

interface InternalAuthProviderProps extends AuthProviderProps {
    /**
     * Test hook: allow forcing dev mode off even when simulated auth is on so that
     * unauthenticated flows (e.g., ProtectedRoute redirects) can be exercised.
     */
    __forceDevOff?: boolean;
}

export const AuthProvider: React.FC<InternalAuthProviderProps> = ({ children, __forceDevOff }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Wave 26 — the /auth/me identity behind a real session (null in simulated mode).
    const [me, setMe] = useState<MeResponse | null>(null);

    // Wave 25 Phase E: "dev mode" now means SIMULATED AUTH IS ACTIVE, not
    // "running under the Vite dev server". Real MSAL login in a dev build is
    // NOT dev mode — guards enforce authentication and dev tooling hides.
    const simulatedAuth = useFeatureFlag('use_simulated_auth');
    const simulate = simulatedAuth && !__forceDevOff;

    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            try {
                if (simulate) {
                    // Auto-login with first simulated user in dev mode.
                    const defaultUser = SIMULATED_USERS[0];
                    setUser(defaultUser as AccountInfo);
                    setIsAuthenticated(true);
                    // Wave 25 Phase D regression fix: mint the dev token BEFORE
                    // signaling loading=false. Otherwise widgets/contexts (e.g.
                    // OnboardingContext) fire their first authorized fetch in
                    // the gap and 401 — which onboarding misinterprets as "user
                    // not provisioned" and redirects to /onboarding. We accept
                    // a small extra mount latency to keep first-paint requests
                    // authenticated.
                    const devId = getDevUserId();
                    if (devId != null) {
                        await mintDevToken(devId);
                    }
                    return;
                }

                // ---- Real MSAL path (Wave 25 Phase E) ----
                const outcome = await initializeRealAuth();
                if (outcome.status === 'signed-out') {
                    // ProtectedRoute sends the user to /login.
                    return;
                }
                if (outcome.status === 'rejected') {
                    setError(outcome.message);
                    return;
                }
                setUser(outcome.account);
                setMe(outcome.me);
                setIsAuthenticated(true);
                setError(null);
            } catch (err) {
                console.error('Authentication initialization error:', err);
                setError('Failed to initialize authentication');
            } finally {
                setLoading(false);
            }
        };
        initializeAuth();
    }, [simulate]);

    // Wave 25 Phase C — in simulated-auth mode, re-mint the dev JWT whenever
    // the dev user CHANGES (e.g. switching via DevUserSwitcher). Initial mint
    // happens inline above in initializeAuth so widgets don't race against a
    // missing token on first paint.
    useEffect(() => {
        if (!simulate) return;

        let lastSeenId = getDevUserId();
        const refresh = () => {
            const id = getDevUserId();
            if (id === lastSeenId) return; // dedupe — only react to real changes
            lastSeenId = id;
            if (id == null) {
                clearAuthToken();
                return;
            }
            void mintDevToken(id);
        };

        const unsub = subscribeDevUser(refresh);
        return () => { unsub(); };
    }, [simulate]);

    const login = async () => {
        try {
            setLoading(true);
            setError(null);
            // Full-page redirect to Microsoft; execution resumes in
            // handleRedirectPromise() after the round-trip.
            await msalInstance.initialize();
            await msalInstance.loginRedirect(loginRequest);
        } catch (err: unknown) {
            console.error('Login error:', err);
            const message = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : undefined;
            setError(`Login failed: ${message || 'Unknown error'}`);
            setIsAuthenticated(false);
            setUser(null);
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            clearRenewTimers();
            clearAuthToken();
            if (simulate) {
                // Simulated mode: no identity provider session to end.
                setIsAuthenticated(false);
                setUser(null);
                setError(null);
                return;
            }
            // Ending the session also ends any dev-user impersonation — the
            // next sign-in starts on the admin's own data.
            setImpersonatedUserId(null);
            await msalInstance.logoutRedirect({
                postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
            });
            setIsAuthenticated(false);
            setUser(null);
            setMe(null);
            setError(null);
        } catch (err: unknown) {
            console.error('Logout error:', err);
            const message = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : undefined;
            setError(`Logout failed: ${message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const getAccessToken = async (scopes?: string[]) => {
        try {
            if (simulate) {
                // Wave 25 Phase E: the dev JWT from /auth/dev-login (no more
                // 'mock-dev-token-' stub — every consumer gets a real token).
                return getAuthToken();
            }
            const account = msalInstance.getActiveAccount();
            if (!account) throw new Error('No active account');
            const requestScopes = scopes || pfmpApiScopes.read;
            const silentRequest: SilentRequest = { scopes: requestScopes, account };
            const response = await msalInstance.acquireTokenSilent(silentRequest);
            return response.accessToken;
        } catch (err) {
            if (err instanceof InteractionRequiredAuthError) {
                try {
                    const requestScopes = scopes || pfmpApiScopes.read;
                    await msalInstance.acquireTokenRedirect({ scopes: requestScopes });
                    return null; // Token after redirect
                } catch (interactiveError) {
                    console.error('Interactive token acquisition failed:', interactiveError);
                    return null;
                }
            }
            console.error('Token acquisition error:', err);
            return null;
        }
    };

    const switchUser = (userIndex: number) => {
        if (simulate && userIndex >= 0 && userIndex < SIMULATED_USERS.length) {
            const selectedUser = SIMULATED_USERS[userIndex];
            setUser(selectedUser as AccountInfo);
            setIsAuthenticated(true);
        }
    };

    const contextValue: AuthContextType = {
        isAuthenticated,
        user,
        login,
        logout,
        getAccessToken,
        loading,
        error,
        isDev: simulate,
        switchUser,
        availableUsers: SIMULATED_USERS,
        isAdmin: !simulate && (me?.isAdmin ?? false),
        realUserId: !simulate ? (me?.userId ?? null) : null,
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// useAuth hook moved to separate file to satisfy react-refresh rule (component-only exports here)
