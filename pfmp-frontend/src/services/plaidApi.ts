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
// API Functions
// ============================================================================

/**
 * Create a Plaid Link token for initializing Plaid Link in the frontend.
 * The token is single-use and expires after 4 hours.
 */
export async function createLinkToken(userId: number): Promise<string> {
  const response = await axios.post<LinkTokenResponse>(
    `${API_BASE_URL}/plaid/link-token`,
    {},
    { params: { userId } }
  );
  return response.data.linkToken;
}

/**
 * Exchange a public token from Plaid Link for an access token.
 * This creates the connection and imports all accounts.
 */
export async function exchangePublicToken(
  publicToken: string, 
  userId: number,
  institutionId?: string,
  institutionName?: string
): Promise<ExchangeTokenResponse> {
  const response = await axios.post<ExchangeTokenResponse>(
    `${API_BASE_URL}/plaid/exchange-token`,
    { publicToken, institutionId, institutionName },
    { params: { userId } }
  );
  return response.data;
}

/**
 * Get all Plaid connections for the specified user.
 */
export async function getConnections(userId: number): Promise<PlaidConnection[]> {
  const response = await axios.get<PlaidConnection[]>(
    `${API_BASE_URL}/plaid/connections`,
    { params: { userId } }
  );
  return response.data;
}

/**
 * Get all accounts for a specific connection.
 */
export async function getConnectionAccounts(connectionId: string, userId: number): Promise<PlaidAccount[]> {
  const response = await axios.get<PlaidAccount[]>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/accounts`,
    { params: { userId } }
  );
  return response.data;
}

/**
 * Manually trigger a sync for a specific connection.
 */
export async function syncConnection(connectionId: string, userId: number): Promise<SyncResult> {
  const response = await axios.post<SyncResult>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/sync`,
    {},
    { params: { userId } }
  );
  return response.data;
}

/**
 * Sync all connections for the specified user.
 */
export async function syncAllConnections(userId: number): Promise<SyncResult> {
  const response = await axios.post<SyncResult>(
    `${API_BASE_URL}/plaid/sync-all`,
    {},
    { params: { userId } }
  );
  return response.data;
}

/**
 * Disconnect a bank connection (pauses syncing but allows reconnection).
 * This marks the connection as disconnected but preserves the access token for potential reconnection.
 */
export async function disconnectConnection(connectionId: string, userId: number): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}/plaid/connections/${connectionId}`,
    { params: { userId } }
  );
}

/**
 * Create a reconnect link token for a disconnected connection.
 * Returns a link token to use with Plaid Link in update mode.
 */
export async function createReconnectLinkToken(connectionId: string, userId: number): Promise<string> {
  const response = await axios.post<LinkTokenResponse>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/reconnect`,
    {},
    { params: { userId } }
  );
  return response.data.linkToken;
}

/**
 * Mark a connection as successfully reconnected after user completes update mode Link.
 */
export async function reconnectSuccess(connectionId: string, userId: number): Promise<PlaidConnection> {
  const response = await axios.post<PlaidConnection>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/reconnect-success`,
    {},
    { params: { userId } }
  );
  return response.data;
}

/**
 * Permanently delete a connection and optionally its linked accounts.
 * @param deleteAccounts If true, delete all linked accounts. If false, convert them to manual accounts.
 */
export async function deleteConnectionPermanently(connectionId: string, userId: number, deleteAccounts: boolean): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}/plaid/connections/${connectionId}/permanent`,
    { params: { userId, deleteAccounts } }
  );
}

/**
 * Get sync history for a connection.
 */
export async function getSyncHistory(connectionId: string, userId: number, limit = 10): Promise<SyncHistoryEntry[]> {
  const response = await axios.get<SyncHistoryEntry[]>(
    `${API_BASE_URL}/plaid/connections/${connectionId}/history`,
    { params: { userId, limit } }
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
