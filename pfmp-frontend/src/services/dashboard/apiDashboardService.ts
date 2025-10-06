import type { DashboardData, DashboardService } from './types';

interface ApiDashboardSummaryResponse {
  netWorth: DashboardData['netWorth'];
  accounts?: DashboardData['accounts'];
  insights?: DashboardData['insights'];
}

const API_BASE = typeof window === 'undefined' ? 'http://localhost/api/dashboard' : '/api/dashboard';

async function safeJson<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function fetchSummary(): Promise<ApiDashboardSummaryResponse> {
  const resp = await fetch(`${API_BASE}/summary`, {
    headers: {
      Accept: 'application/json',
    },
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
