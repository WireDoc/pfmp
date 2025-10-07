import type { SilentRequest } from '@azure/msal-browser';
import { isFeatureEnabled } from '../../flags/featureFlags';
import { pfmpApiScopes } from '../../config/authConfig';
import { msalInstance } from '../../contexts/auth/msalInstance';
import type {
  DashboardData,
  DashboardService,
  AlertCard,
  AdviceItem,
  TaskItem,
} from './types';

interface ApiDashboardSummaryResponse {
  netWorth: DashboardData['netWorth'];
  accounts?: DashboardData['accounts'];
  insights?: DashboardData['insights'];
}

const API_ORIGIN = (() => {
  if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') {
    return 'http://localhost';
  }
  return window.location.origin;
})();

const DASHBOARD_BASE = `${API_ORIGIN}/api/dashboard`;
const DEFAULT_DASHBOARD_USER_ID = (import.meta.env?.VITE_PFMP_DASHBOARD_USER_ID ?? '1').toString();

const ALERTS_URL = `${API_ORIGIN}/api/alerts?userId=${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}&isActive=true`;
const ADVICE_URL = `${API_ORIGIN}/api/Advice/user/${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}?status=Proposed&includeDismissed=false`;
const TASKS_URL = `${API_ORIGIN}/api/Tasks?userId=${encodeURIComponent(DEFAULT_DASHBOARD_USER_ID)}&status=Pending`;

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

async function fetchSummary(headers: HeadersInit): Promise<ApiDashboardSummaryResponse> {
  const resp = await fetch(`${DASHBOARD_BASE}/summary`, {
    headers,
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch dashboard summary (${resp.status})`);
  }
  return safeJson<ApiDashboardSummaryResponse>(resp);
}

async function fetchList<T>(url: string, headers: HeadersInit, context: 'alerts' | 'advice' | 'tasks'): Promise<T[]> {
  const resp = await fetch(url, { headers });
  if (resp.status === 204 || resp.status === 404) {
    return [];
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch dashboard ${context} (${resp.status})`);
  }
  const data = await safeJson<unknown>(resp);
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object') {
    const maybeItems = (data as Record<string, unknown>)['items'];
    if (Array.isArray(maybeItems)) {
      return maybeItems as T[];
    }
  }
  return [];
}

export function createApiDashboardService(): DashboardService {
  return {
    async load() {
      const headers: HeadersInit = {
        Accept: 'application/json',
        ...(await resolveAuthHeaders()),
      };

      const [dto, alerts, advice, tasks] = await Promise.all([
        fetchSummary(headers),
        fetchList<AlertCard>(ALERTS_URL, headers, 'alerts').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API alerts fetch failed; defaulting to empty list', error);
          }
          return [] as AlertCard[];
        }),
        fetchList<AdviceItem>(ADVICE_URL, headers, 'advice').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API advice fetch failed; defaulting to empty list', error);
          }
          return [] as AdviceItem[];
        }),
        fetchList<TaskItem>(TASKS_URL, headers, 'tasks').catch((error) => {
          if (import.meta.env?.MODE !== 'production') {
            console.warn('Dashboard API tasks fetch failed; defaulting to empty list', error);
          }
          return [] as TaskItem[];
        }),
      ]);

      if (!dto.netWorth) {
        throw new Error('Dashboard summary response missing netWorth payload');
      }
      return {
        netWorth: dto.netWorth,
        accounts: dto.accounts ?? [],
        insights: dto.insights ?? [],
        alerts,
        advice,
        tasks,
      } satisfies DashboardData;
    },
  };
}
