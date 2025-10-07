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

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/alerts')) {
        return new Response(JSON.stringify([
          {
            alertId: 1,
            userId: 1,
            title: 'Alert',
            message: 'Check this out',
            severity: 'High',
            category: 'Portfolio',
            isActionable: true,
            portfolioImpactScore: 50,
            createdAt: '2025-10-06T12:00:00Z',
            isRead: false,
            isDismissed: false,
            expiresAt: null,
            actionUrl: null,
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.toLowerCase().includes('/api/advice/user/')) {
        return new Response(JSON.stringify([
          {
            adviceId: 10,
            userId: 1,
            theme: 'General',
            status: 'Proposed',
            consensusText: 'Do thing',
            confidenceScore: 70,
            sourceAlertId: 1,
            linkedTaskId: null,
            createdAt: '2025-10-06T12:05:00Z',
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/Tasks') || url.includes('/api/tasks')) {
        return new Response(JSON.stringify([
          {
            taskId: 20,
            userId: 1,
            type: 'GoalAdjustment',
            title: 'Task',
            description: 'Complete task',
            priority: 'Medium',
            status: 'Pending',
            createdDate: '2025-10-06T12:06:00Z',
            dueDate: null,
            sourceAdviceId: 10,
            sourceAlertId: 1,
            progressPercentage: 0,
            confidenceScore: 80,
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch ? originalFetch(input as any, init as any) : Promise.reject(new Error('No fetch available'));
    });

    mswServer.use(...mockDashboardSummary(summary));

    const apiService = createApiDashboardService();
    const data = await apiService.load();

  expect(fetchSpy).toHaveBeenCalledTimes(4);
  const urls = fetchSpy.mock.calls.map(call => String(call?.[0]));
  expect(urls[0]).toContain('/api/dashboard/summary');
  expect(urls.some(url => url.includes('/api/alerts'))).toBe(true);
  expect(urls.some(url => url.toLowerCase().includes('/api/advice/user/'))).toBe(true);
  expect(urls.some(url => url.includes('/api/Tasks') || url.includes('/api/tasks'))).toBe(true);
    expect(data.netWorth.netWorth.amount).toBe(900);
    expect(data.accounts).toEqual([]);
    expect(data.insights).toEqual([]);
    expect(data.alerts).toHaveLength(1);
    expect(data.advice).toHaveLength(1);
    expect(data.tasks).toHaveLength(1);
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
    expect(data.alerts).toEqual([]);
    expect(data.advice).toEqual([]);
    expect(data.tasks).toEqual([]);
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
