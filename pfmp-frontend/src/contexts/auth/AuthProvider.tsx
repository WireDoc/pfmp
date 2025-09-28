import React, { useEffect, useState } from 'react';
// Using only msal-browser to avoid peer dependency mismatch of @azure/msal-react with React 19.
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import type { AuthenticationResult, AccountInfo, SilentRequest } from '@azure/msal-browser';
import { msalConfig, loginRequest, pfmpApiScopes } from '../../config/authConfig';
import { AuthContext } from './AuthContextObject';
import { msalInstance } from './msalInstance';
import { SIMULATED_USERS } from './simulatedUsers';
import type { AuthContextType, AuthProviderProps } from './types';

// Vite dev flag (true for `npm run dev` / local development server)
const DEV_MODE = import.meta.env.DEV;

// AuthContext now defined in AuthContextObject.ts

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (DEV_MODE) {
                    // Auto-login with first simulated user in dev mode.
                    const defaultUser = SIMULATED_USERS[0];
                    setUser(defaultUser as AccountInfo);
                    setIsAuthenticated(true);
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
    }, []);

    const setAuthenticationState = (response: AuthenticationResult) => {
        if (response.account) {
            msalInstance.setActiveAccount(response.account);
            setUser(response.account);
            setIsAuthenticated(true);
            setError(null);
        }
    };

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
        if (DEV_MODE && userIndex >= 0 && userIndex < SIMULATED_USERS.length) {
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
        isDev: DEV_MODE,
        switchUser,
        availableUsers: SIMULATED_USERS,
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// useAuth hook moved to separate file to satisfy react-refresh rule (component-only exports here)
