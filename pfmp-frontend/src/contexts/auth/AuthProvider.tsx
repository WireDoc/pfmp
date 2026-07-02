import React, { useCallback, useEffect, useState } from 'react';
import { isFeatureEnabled } from '../../flags/featureFlags';
// Using only msal-browser to avoid peer dependency mismatch of @azure/msal-react with React 19.
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import type { AuthenticationResult, AccountInfo, SilentRequest } from '@azure/msal-browser';
import { msalConfig, loginRequest, pfmpApiScopes } from '../../config/authConfig';
import { AuthContext } from './AuthContextObject';
import { msalInstance } from './msalInstance';
import { SIMULATED_USERS } from './simulatedUsers';
import type { AuthContextType, AuthProviderProps } from './types';
import { setAuthToken, clearAuthToken } from '../../services/authToken';
import { getDevUserId, subscribeDevUser } from '../../dev/devUserState';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5052/api';

// Proactive renewal timer — re-mints ~5 minutes before the current dev token
// expires so a tab left open past the 60-min token lifetime doesn't start
// 401ing (previously required a manual hard refresh the next morning).
let devTokenRenewTimer: ReturnType<typeof setTimeout> | undefined;

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

// Vite dev flag (true for `npm run dev` / local development server)
const DEV_MODE = import.meta.env.DEV;

// AuthContext now defined in AuthContextObject.ts

interface InternalAuthProviderProps extends AuthProviderProps {
    /**
     * Test hook: allow forcing dev mode off even when import.meta.env.DEV is true so that
     * unauthenticated flows (e.g., ProtectedRoute redirects) can be exercised.
     */
    __forceDevOff?: boolean;
}

export const AuthProvider: React.FC<InternalAuthProviderProps> = ({ children, __forceDevOff }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const setAuthenticationState = useCallback((response: AuthenticationResult) => {
        if (response.account) {
            msalInstance.setActiveAccount(response.account);
            setUser(response.account);
            setIsAuthenticated(true);
            setError(null);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const simulate = isFeatureEnabled('use_simulated_auth');
                if (simulate && !__forceDevOff) {
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
                    setLoading(false);
                    return;
                }

                await msalInstance.initialize();
                const response = await msalInstance.handleRedirectPromise();
                if (response) {
                    setAuthenticationState(response);
                }

                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    const account = accounts[0];
                    msalInstance.setActiveAccount(account);
                    setUser(account);
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error('Authentication initialization error:', err);
                setError('Failed to initialize authentication');
            } finally {
                setLoading(false);
            }
        };
        initializeAuth();
    }, [__forceDevOff, setAuthenticationState]);

    // Wave 25 Phase C — in simulated-auth mode, re-mint the dev JWT whenever
    // the dev user CHANGES (e.g. switching via DevUserSwitcher). Initial mint
    // happens inline above in initializeAuth so widgets don't race against a
    // missing token on first paint.
    useEffect(() => {
        const simulate = isFeatureEnabled('use_simulated_auth');
        if (!simulate || __forceDevOff) return;

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
    }, [__forceDevOff]);

    const login = async () => {
        try {
            setLoading(true);
            setError(null);
            await msalInstance.loginRedirect(loginRequest);
        } catch (err: unknown) {
            console.error('Login error:', err);
            const message = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message : undefined;
            setError(`Login failed: ${message || 'Unknown error'}`);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await msalInstance.logoutRedirect({
                postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
            });
            setIsAuthenticated(false);
            setUser(null);
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
            if (DEV_MODE) {
                return 'mock-dev-token-' + Date.now();
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
        if (isFeatureEnabled('use_simulated_auth') && userIndex >= 0 && userIndex < SIMULATED_USERS.length) {
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
    isDev: __forceDevOff ? false : DEV_MODE,
        switchUser,
        availableUsers: SIMULATED_USERS,
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// useAuth hook moved to separate file to satisfy react-refresh rule (component-only exports here)
