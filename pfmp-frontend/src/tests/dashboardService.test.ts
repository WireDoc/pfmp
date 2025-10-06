import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApiDashboardService } from '../services/dashboard/apiDashboardService';
import { getDashboardService, __resetDashboardServiceForTest } from '../services/dashboard';

const originalFetch = global.fetch;

afterEach(() => {
  __resetDashboardServiceForTest();
  vi.restoreAllMocks();
  if (originalFetch) {
    global.fetch = originalFetch;
  }
});

describe('Dashboard services', () => {
  it('mock dashboard service does not hit fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const data = await getDashboardService().load();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data.netWorth.totalAssets.amount).toBe(250_000);
  });

  it('API dashboard service loads summary payload', async () => {
    const summary = {
      netWorth: {
        totalAssets: { amount: 1000, currency: 'USD' },
        totalLiabilities: { amount: 100, currency: 'USD' },
        netWorth: { amount: 900, currency: 'USD' },
        lastUpdated: '2025-10-06T12:00:00Z',
      },
      accounts: [],
      insights: [],
    } as const;

    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes('/api/dashboard/summary')) {
        return new Response(JSON.stringify(summary), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch!(input as RequestInfo, init);
    });

    const apiService = createApiDashboardService();
    const data = await apiService.load();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/dashboard/summary');
    expect(data.netWorth.netWorth.amount).toBe(900);
    expect(data.accounts).toEqual([]);
    expect(data.insights).toEqual([]);
  });

  it('API dashboard service throws when netWorth missing', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes('/api/dashboard/summary')) {
        return new Response(JSON.stringify({ accounts: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch!(input as RequestInfo, init);
    });

    const apiService = createApiDashboardService();
    await expect(apiService.load()).rejects.toThrow(/netWorth/);
  });
});
