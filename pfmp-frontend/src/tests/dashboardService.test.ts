import { describe, it, expect, afterEach, vi } from 'vitest';
import { mockDashboardSummary, http, HttpResponse } from './mocks/handlers';
import { mswServer } from './mocks/server';
import { createApiDashboardService } from '../services/dashboard/apiDashboardService';
import { getDashboardService, __resetDashboardServiceForTest } from '../services/dashboard';
import { updateFlags } from '../flags/featureFlags';
import { msalInstance } from '../contexts/auth/msalInstance';
import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';

const originalFetch = global.fetch;

afterEach(() => {
  updateFlags({ dashboard_wave4_real_data: false, use_simulated_auth: true });
  __resetDashboardServiceForTest();
  vi.restoreAllMocks();
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  mswServer.resetHandlers();
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

    const fetchSpy = vi.spyOn(global, 'fetch');
    mswServer.use(...mockDashboardSummary(summary));

    const apiService = createApiDashboardService();
    const data = await apiService.load();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/api/dashboard/summary');
    expect(data.netWorth.netWorth.amount).toBe(900);
    expect(data.accounts).toEqual([]);
    expect(data.insights).toEqual([]);
  });

  it('API dashboard service throws when netWorth missing', async () => {
    mswServer.use(...mockDashboardSummary({ accounts: [] }));

    const apiService = createApiDashboardService();
    await expect(apiService.load()).rejects.toThrow(/netWorth/);
  });

  it('API dashboard service surfaces HTTP errors', async () => {
    mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const apiService = createApiDashboardService();
    await expect(apiService.load()).rejects.toThrow(/Failed to fetch dashboard summary \(500\)/);
  });

  it('defaults optional arrays when API omits them', async () => {
    const summary = {
      netWorth: {
        totalAssets: { amount: 2000, currency: 'USD' },
        totalLiabilities: { amount: 800, currency: 'USD' },
        netWorth: { amount: 1200, currency: 'USD' },
        lastUpdated: '2025-10-06T12:00:00Z',
      },
    } as const;

    mswServer.use(...mockDashboardSummary(summary));

    const apiService = createApiDashboardService();
    const data = await apiService.load();

    expect(data.accounts).toEqual([]);
    expect(data.insights).toEqual([]);
  });

  it('includes Authorization header when simulated auth disabled and token available', async () => {
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

    const fetchSpy = vi.spyOn(global, 'fetch');
    mswServer.use(...mockDashboardSummary(summary));

    const account = { homeAccountId: 'abc', localAccountId: 'abc', environment: 'test', tenantId: 'tenant' } as AccountInfo;
    vi.spyOn(msalInstance, 'initialize').mockResolvedValue();
    vi.spyOn(msalInstance, 'getActiveAccount').mockReturnValue(account);
    vi.spyOn(msalInstance, 'getAllAccounts').mockReturnValue([account]);
    vi.spyOn(msalInstance, 'acquireTokenSilent').mockResolvedValue({ accessToken: 'token-123' } as AuthenticationResult);

    updateFlags({ use_simulated_auth: false });

    const apiService = createApiDashboardService();
    const data = await apiService.load();

    expect(data.netWorth.netWorth.amount).toBe(900);
    const init = fetchSpy.mock.calls[0]?.[1];
    let authHeader: string | undefined;
    if (init?.headers instanceof Headers) {
      authHeader = init.headers.get('Authorization') ?? undefined;
    } else if (Array.isArray(init?.headers)) {
      authHeader = init.headers.find(([key]) => key.toLowerCase() === 'authorization')?.[1];
    } else if (init?.headers && typeof init.headers === 'object') {
      authHeader = (init.headers as Record<string, string>).Authorization;
    }
    expect(authHeader).toBe('Bearer token-123');
  });
});
