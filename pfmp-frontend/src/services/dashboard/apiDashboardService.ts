import type { SilentRequest } from '@azure/msal-browser';
import { isFeatureEnabled } from '../../flags/featureFlags';
import { pfmpApiScopes } from '../../config/authConfig';
import { msalInstance } from '../../contexts/auth/msalInstance';
import type { DashboardData, DashboardService } from './types';

interface ApiDashboardSummaryResponse {
  netWorth: DashboardData['netWorth'];
  accounts?: DashboardData['accounts'];
  insights?: DashboardData['insights'];
}

const API_BASE = (() => {
  if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') {
    return 'http://localhost/api/dashboard';
  }
  return `${window.location.origin}/api/dashboard`;
})();

async function resolveAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }
  if (isFeatureEnabled('use_simulated_auth')) {
    return {};
  }

  try {
    // Initialize lazily; safe to call repeatedly.
    await msalInstance.initialize();
    const activeAccount = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
    if (!activeAccount) {
      return {};
    }
    const request: SilentRequest = {
      account: activeAccount,
      scopes: pfmpApiScopes.read,
    };
    const tokenResponse = await msalInstance.acquireTokenSilent(request);
    if (!tokenResponse?.accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${tokenResponse.accessToken}` };
  } catch (error) {
    if (import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'test') {
      console.warn('Dashboard API token acquisition failed; continuing without auth', error);
    }
    return {};
  }
}

async function safeJson<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function fetchSummary(): Promise<ApiDashboardSummaryResponse> {
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(await resolveAuthHeaders()),
  };
  const resp = await fetch(`${API_BASE}/summary`, {
    headers,
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch dashboard summary (${resp.status})`);
  }
  return safeJson<ApiDashboardSummaryResponse>(resp);
}

export function createApiDashboardService(): DashboardService {
  return {
    async load() {
      const dto = await fetchSummary();
      if (!dto.netWorth) {
        throw new Error('Dashboard summary response missing netWorth payload');
      }
      return {
        netWorth: dto.netWorth,
        accounts: dto.accounts ?? [],
        insights: dto.insights ?? [],
      } satisfies DashboardData;
    },
  };
}
