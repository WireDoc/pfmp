import type { AccountInfo } from '@azure/msal-browser';
import type { ReactNode } from 'react';

// Simulated user used only in development mode to bypass Azure AD interactive login.
export interface SimulatedUser extends Partial<AccountInfo> {
    username: string;
    name: string;
    email?: string;
    homeAccountId: string;
    localAccountId: string;
    environment: string;
    tenantId: string;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: (scopes?: string[]) => Promise<string | null>;
    loading: boolean;
    error: string | null;
    // Development mode only additions
    isDev: boolean;
    switchUser: (userIndex: number) => void;
    availableUsers: SimulatedUser[];
    // Wave 26 — real-auth mode extras (false/null in simulated mode)
    /** Whether the authenticated PFMP user has the admin role. */
    isAdmin: boolean;
    /** The PFMP userId behind the real token — stays fixed while impersonating a dev user. */
    realUserId: number | null;
}

export interface AuthProviderProps {
    children: ReactNode;
}
