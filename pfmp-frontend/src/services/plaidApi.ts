/**
 * Plaid API Service (Wave 11)
 * 
 * Handles communication with the backend PlaidController for bank account linking.
 * All Plaid API calls go through our backend - NEVER call Plaid directly from frontend.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';

// ============================================================================
// Types
// ============================================================================

export interface PlaidConnection {
  connectionId: string;
  institutionName: string;
  institutionId?: string;
  status: ConnectionStatus;
  errorMessage?: string;
  connectedAt: string;
  lastSyncedAt?: string;
}

export interface PlaidAccount {
  cashAccountId: string;
  name: string;
  balance: number;
  plaidAccountId?: string;
  syncStatus: string;
  lastSyncedAt?: string;
}

export interface SyncResult {
  success: boolean;
  accountsUpdated: number;
  errorMessage?: string;
}

export interface SyncHistoryEntry {
  syncHistoryId: string;
  syncStartedAt: string;
  syncCompletedAt?: string;
  status: string;
  errorMessage?: string;
  accountsUpdated: number;
  durationMs?: number;
}

export interface LinkTokenResponse {
  linkToken: string;
}

export interface ExchangeTokenResponse {
  connection: PlaidConnection;
  accounts: PlaidAccount[];
}

export type ConnectionStatus = 
  | 'NotConnected'
  | 'Connected'
  | 'Syncing'
  | 'SyncFailed'
  | 'Expired'
  | 'Disconnected';

// ============================================================================
// Helper to get auth headers
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  // Get token from localStorage or auth context
  const token = localStorage.getItem('accessToken');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a Plaid Link token for initializing Plaid Link in the frontend.
 * The token is single-use and expires after 4 hours.
 */
export async function createLinkToken(): Promise<string> {
  const response = await axios.post<LinkTokenResponse>(
    `${API_BASE_URL}/plaid/link-token`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data.linkToken;
}

/**
 * Exchange a public token from Plaid Link for an access token.
 * This creates the connection and imports all accounts.
 */
export async function exchangePublicToken(publicToken: string): Promise<ExchangeTokenResponse> {
  const response = await axios.post<ExchangeTokenResponse>(
    `${API_BASE_URL}/plaid/exchange-token`,
    { publicToken },
    { headers: getAuthHeaders() }
  );
  return response.data;
}

/**
 * Get all Plaid connections for the current user.
 */
export async function getConnections(): Promise<PlaidConnection[]> {
  const response = await axios.get<PlaidConnection[]>(
    `${API_BASE_URL}/plaid/connections`,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

/**
 * Get all accounts for a specific connection.
 */
export async function getConnectionAccounts(connectionId: string): Promise<PlaidAccount[]> {
  const response = await axios.get<PlaidAccount[]>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/accounts`,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

/**
 * Manually trigger a sync for a specific connection.
 */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const response = await axios.post<SyncResult>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/sync`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
}

/**
 * Sync all connections for the current user.
 */
export async function syncAllConnections(): Promise<SyncResult> {
  const response = await axios.post<SyncResult>(
    `${API_BASE_URL}/plaid/sync-all`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
}

/**
 * Disconnect a bank connection.
 * This removes the connection from Plaid and marks linked accounts as disconnected.
 */
export async function disconnectConnection(connectionId: string): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}/plaid/connections/${connectionId}`,
    { headers: getAuthHeaders() }
  );
}

/**
 * Get sync history for a connection.
 */
export async function getSyncHistory(connectionId: string, limit = 10): Promise<SyncHistoryEntry[]> {
  const response = await axios.get<SyncHistoryEntry[]>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/history`,
    { 
      params: { limit },
      headers: getAuthHeaders() 
    }
  );
  return response.data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a human-readable status label for a connection status.
 */
export function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'Connected':
      return 'Connected';
    case 'Syncing':
      return 'Syncing...';
    case 'SyncFailed':
      return 'Sync Failed';
    case 'Expired':
      return 'Reconnection Required';
    case 'Disconnected':
      return 'Disconnected';
    default:
      return 'Not Connected';
  }
}

/**
 * Get MUI color for a connection status.
 */
export function getStatusColor(status: ConnectionStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'Connected':
      return 'success';
    case 'Syncing':
      return 'warning';
    case 'SyncFailed':
    case 'Expired':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Format a date string for display.
 */
export function formatSyncTime(dateString?: string): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}
