import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { updateFlags } from '../flags/featureFlags';
import { __resetDashboardServiceForTest } from '../services/dashboard';
import { useDashboardData } from '../services/dashboard/useDashboardData';
import {
  mockDashboardSummary,
  mockDashboardAlerts,
  mockDashboardAdvice,
  mockDashboardTasks,
  http,
  HttpResponse,
} from './mocks/handlers';
import { mswServer } from './mocks/server';

describe('useDashboardData integration', () => {
  beforeEach(() => {
    updateFlags({ dashboard_wave4_real_data: true, use_simulated_auth: true });
    __resetDashboardServiceForTest();
  });

  afterEach(() => {
    updateFlags({ dashboard_wave4_real_data: false });
    __resetDashboardServiceForTest();
  });

  it('loads extended dashboard lists from API adapter', async () => {
    const now = '2025-10-07T00:00:00Z';
    mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({
          netWorth: {
            totalAssets: { amount: 125_000, currency: 'USD' },
            totalLiabilities: { amount: 45_000, currency: 'USD' },
            netWorth: { amount: 80_000, currency: 'USD' },
            change30dPct: 1.2,
            lastUpdated: now,
          },
          accounts: [],
          insights: [],
        }),
      ),
      http.get(/\/api\/alerts/i, () =>
        HttpResponse.json([
          {
            alertId: 88,
            userId: 1,
            title: 'Portfolio drift detected',
            message: 'Equity exposure exceeds policy band.',
            severity: 'High',
            category: 'Portfolio',
            isActionable: true,
            portfolioImpactScore: 70,
            createdAt: now,
            isRead: false,
            isDismissed: false,
            expiresAt: null,
            actionUrl: '/alerts/88',
          },
        ]),
      ),
      http.get(/\/api\/advice/i, () =>
        HttpResponse.json([
          {
            adviceId: 501,
            userId: 1,
            theme: 'Rebalance',
            status: 'Proposed',
            consensusText: 'Shift 3% from equities into bonds.',
            confidenceScore: 82,
            sourceAlertId: 88,
            linkedTaskId: 990,
            createdAt: now,
          },
        ]),
      ),
      http.get(/\/api\/tasks/i, () =>
        HttpResponse.json([
          {
            taskId: 990,
            userId: 1,
            type: 'Rebalance',
            title: 'Execute equity rebalance',
            description: 'Move 3% allocation into bonds via target date fund.',
            priority: 'High',
            status: 'Pending',
            createdDate: now,
            dueDate: null,
            sourceAdviceId: 501,
            sourceAlertId: 88,
            progressPercentage: 0,
            confidenceScore: 82,
          },
        ]),
      ),
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, 'fetch');

    const { result } = renderHook(() => useDashboardData());

    try {
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(5));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.alerts).toHaveLength(1);
      expect(result.current.data?.advice?.[0]?.consensusText).toContain('Shift 3%');
      expect(result.current.data?.tasks?.[0]?.title).toBe('Execute equity rebalance');
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      fetchSpy.mockRestore();
    }
  });

  it('gracefully defaults to empty lists when secondary endpoints fail', async () => {
    const now = '2025-10-07T08:00:00Z';
    mswServer.use(
      ...mockDashboardSummary({
        netWorth: {
          totalAssets: { amount: 80_000, currency: 'USD' },
          totalLiabilities: { amount: 10_000, currency: 'USD' },
          netWorth: { amount: 70_000, currency: 'USD' },
          lastUpdated: now,
        },
        accounts: [],
        insights: [],
      }),
      ...mockDashboardAlerts([], { status: 500 }),
      ...mockDashboardAdvice([], { status: 500 }),
      ...mockDashboardTasks([], { status: 500 }),
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data?.alerts).toEqual([]);
    expect(result.current.data?.advice).toEqual([]);
    expect(result.current.data?.tasks).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });

  it('parses list payloads delivered via { items: [] } envelopes', async () => {
    const now = '2025-10-07T09:00:00Z';
    mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({
          netWorth: {
            totalAssets: { amount: 50_000, currency: 'USD' },
            totalLiabilities: { amount: 25_000, currency: 'USD' },
            netWorth: { amount: 25_000, currency: 'USD' },
            lastUpdated: now,
          },
          accounts: [],
          insights: [],
        }),
      ),
      http.get(/\/api\/alerts/i, () =>
        HttpResponse.json({
          items: [
            {
              alertId: 71,
              userId: 1,
              title: 'Budget variance',
              message: 'Spending ahead of plan this month.',
              severity: 'Medium',
              category: 'Cashflow',
              isActionable: true,
              portfolioImpactScore: 32,
              createdAt: now,
              isRead: false,
              isDismissed: false,
              expiresAt: null,
              actionUrl: null,
            },
          ],
        }),
      ),
      http.get(/\/api\/advice/i, () =>
        HttpResponse.json({
          items: [
            {
              adviceId: 610,
              userId: 1,
              theme: 'Cashflow',
              status: 'Proposed',
              consensusText: 'Shift discretionary spending to savings for 2 months.',
              confidenceScore: 55,
              sourceAlertId: 71,
              linkedTaskId: null,
              createdAt: now,
            },
          ],
        }),
      ),
      http.get(/\/api\/tasks/i, () =>
        HttpResponse.json({
          items: [
            {
              taskId: 301,
              userId: 1,
              type: 'BudgetReview',
              title: 'Review discretionary budget',
              description: 'Audit entertainment category for overspend.',
              priority: 'Medium',
              status: 'Pending',
              createdDate: now,
              dueDate: null,
              sourceAdviceId: 610,
              sourceAlertId: 71,
              progressPercentage: null,
              confidenceScore: null,
            },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.alerts?.[0]?.title).toBe('Budget variance');
    expect(result.current.data?.advice?.[0]?.theme).toBe('Cashflow');
    expect(result.current.data?.tasks?.[0]?.type).toBe('BudgetReview');
  });
});