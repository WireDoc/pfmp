import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { 
    PublicClientApplication, 
    InteractionRequiredAuthError,
    AuthenticationResult, 
    AccountInfo, 
    SilentRequest 
} from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, loginRequest, pfmpApiScopes } from '../config/authConfig';

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Development mode configuration
const DEV_MODE = import.meta.env.DEV; // Vite development mode flag

// Simulated users for development
interface SimulatedUser extends Partial<AccountInfo> {
    username: string;
    name: string;
    email?: string;
    homeAccountId: string;
    localAccountId: string;
    environment: string;
    tenantId: string;
}

const SIMULATED_USERS: SimulatedUser[] = [
    {
        username: 'john.smith@example.com',
        name: 'John Smith',
        email: 'john.smith@example.com',
        homeAccountId: 'dev-john-001',
        localAccountId: 'dev-john-001',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    },
    {
        username: 'sarah.johnson@example.com', 
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        homeAccountId: 'dev-sarah-002',
        localAccountId: 'dev-sarah-002',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    },
    {
        username: 'mike.davis@example.com',
        name: 'Mike Davis', 
        email: 'mike.davis@example.com',
        homeAccountId: 'dev-mike-003',
        localAccountId: 'dev-mike-003',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    }
];

// Authentication context interface
interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: (scopes?: string[]) => Promise<string | null>;
    loading: boolean;
    error: string | null;
    // Development mode properties
    isDev: boolean;
    switchUser: (userIndex: number) => void;
    availableUsers: SimulatedUser[];
}

// Create authentication context
const AuthContext = createContext<AuthContextType | null>(null);

// Authentication provider props
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Authentication Provider Component
 * Wraps the application with MSAL and provides authentication state management
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize authentication state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Development mode: Auto-login with first simulated user
                if (DEV_MODE) {
                    console.log('🔧 DEV MODE: Auto-login enabled');
                    const defaultUser = SIMULATED_USERS[0];
                    setUser(defaultUser as AccountInfo);
                    setIsAuthenticated(true);
                    setLoading(false);
                    console.log('🔧 DEV MODE: Auto-logged in as', defaultUser.name);
                    return;
                }

                // Production mode: Use MSAL
                await msalInstance.initialize();
                
                // Handle redirect responses
                const response = await msalInstance.handleRedirectPromise();
                if (response) {
                    console.log('Redirect response received:', response);
                    setAuthenticationState(response);
                }
                
                // Check if user is already signed in
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    const account = accounts[0];
                    msalInstance.setActiveAccount(account);
                    setUser(account);
                    setIsAuthenticated(true);
                    console.log('User already authenticated:', account.username);
                }
            } catch (error) {
                console.error('Authentication initialization error:', error);
                setError('Failed to initialize authentication');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Set authentication state helper
    const setAuthenticationState = (response: AuthenticationResult) => {
        if (response.account) {
            msalInstance.setActiveAccount(response.account);
            setUser(response.account);
            setIsAuthenticated(true);
            setError(null);
        }
    };

    // Login function
    const login = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Starting login process...');
            // Use redirect flow to avoid CORS popup issues
            await msalInstance.loginRedirect(loginRequest);
            console.log('Login redirect initiated...');
            // Note: setAuthenticationState will be called by handleRedirectPromise
            
        } catch (error: any) {
            console.error('Login error:', error);
            setError(`Login failed: ${error.message || 'Unknown error'}`);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async (): Promise<void> => {
        try {
            setLoading(true);
            console.log('Starting logout process...');
            
            await msalInstance.logoutRedirect({
                postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
            });
            
            setIsAuthenticated(false);
            setUser(null);
            setError(null);
            console.log('Logout successful');
            
        } catch (error: any) {
            console.error('Logout error:', error);
            setError(`Logout failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // Get access token for API calls
    const getAccessToken = async (scopes?: string[]): Promise<string | null> => {
        try {
            // In development mode, return a mock token
            if (DEV_MODE) {
                return 'mock-dev-token-' + Date.now();
            }

            const account = msalInstance.getActiveAccount();
            if (!account) {
                throw new Error('No active account');
            }

            const requestScopes = scopes || pfmpApiScopes.read;
            const silentRequest: SilentRequest = {
                scopes: requestScopes,
                account: account,
            };

            const response = await msalInstance.acquireTokenSilent(silentRequest);
            return response.accessToken;
            
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // Fallback to interactive method if silent fails
                try {
                    const requestScopes = scopes || pfmpApiScopes.read;
                    // Use redirect for consistency (popup alternative causes CORS issues)
                    await msalInstance.acquireTokenRedirect({
                        scopes: requestScopes,
                    });
                    return null; // Token will be available after redirect
                } catch (interactiveError) {
                    console.error('Interactive token acquisition failed:', interactiveError);
                    return null;
                }
            } else {
                console.error('Token acquisition error:', error);
                return null;
            }
        }
    };

    // Development mode user switcher
    const switchUser = (userIndex: number): void => {
        if (DEV_MODE && userIndex >= 0 && userIndex < SIMULATED_USERS.length) {
            const selectedUser = SIMULATED_USERS[userIndex];
            setUser(selectedUser as AccountInfo);
            setIsAuthenticated(true);
            console.log('🔧 DEV MODE: Switched to user', selectedUser.name);
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
        // Development mode properties
        isDev: DEV_MODE,
        switchUser,
        availableUsers: SIMULATED_USERS,
    };

    return (
        <MsalProvider instance={msalInstance}>
            <AuthContext.Provider value={contextValue}>
                {children}
            </AuthContext.Provider>
        </MsalProvider>
    );
};

/**
 * Custom hook to use authentication context
 * Provides easy access to authentication state and functions
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * Higher-order component for protected routes
 * Redirects to login if user is not authenticated
 */
export const withAuth = <P extends object>(
    Component: React.ComponentType<P>
): React.FC<P> => {
    return (props: P) => {
        const { isAuthenticated, loading } = useAuth();

        if (loading) {
            return (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    fontSize: '18px'
                }}>
                    Loading authentication...
                </div>
            );
        }

        if (!isAuthenticated) {
            return (
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    gap: '20px'
                }}>
                    <h2>Authentication Required</h2>
                    <p>Please sign in to access the PFMP Dashboard</p>
                </div>
            );
        }

        return <Component {...props} />;
    };
};