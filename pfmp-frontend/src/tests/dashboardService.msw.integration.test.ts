import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { mswServer } from './mocks/server';
import { mockDashboardSummary, mockDashboardAlerts, mockDashboardAdvice, mockDashboardTasks, http, HttpResponse } from './mocks/handlers';
import { updateFlags } from '../flags/featureFlags';
import { __resetDashboardServiceForTest, getDashboardService } from '../services/dashboard';

const summaryMatcher = /\/api\/dashboard\/summary$/;

describe('api dashboard service (msw integration)', () => {
  beforeEach(() => {
    updateFlags({ dashboard_wave4_real_data: true, use_simulated_auth: true });
    __resetDashboardServiceForTest();
  });

  afterEach(() => {
    updateFlags({ dashboard_wave4_real_data: false });
    __resetDashboardServiceForTest();
    mswServer.resetHandlers();
    vi.restoreAllMocks();
  });

  it('loads dashboard summary and lists via MSW fixtures', async () => {
    const now = '2025-10-08T14:00:00Z';
    mswServer.use(
      ...mockDashboardSummary({
        netWorth: {
          totalAssets: { amount: 150_000, currency: 'USD' },
          totalLiabilities: { amount: 45_000, currency: 'USD' },
          netWorth: { amount: 105_000, currency: 'USD' },
          change1dPct: 0.15,
          change30dPct: 1.8,
          lastUpdated: now,
        },
        accounts: [
          {
            id: 'acct-broker-1',
            name: 'Brokerage Core',
            institution: 'Fidelity',
            type: 'brokerage',
            balance: { amount: 125_000, currency: 'USD' },
            syncStatus: 'ok',
            lastSync: now,
          },
        ],
        insights: [
          {
            id: 'insight-1',
            category: 'allocation',
            title: 'Rebalance suggested',
            body: 'Equity weighting slightly above target.',
            severity: 'info',
            generatedAt: now,
          },
        ],
      }),
      ...mockDashboardAlerts([
        {
          alertId: 501,
          userId: 1,
          title: 'High utilization',
          message: 'Visa utilization exceeds 30%.',
          severity: 'High',
          category: 'Portfolio',
          isActionable: true,
          portfolioImpactScore: 72,
          createdAt: now,
          isRead: false,
          isDismissed: false,
          expiresAt: null,
          actionUrl: null,
        },
      ]),
      ...mockDashboardAdvice([
        {
          adviceId: 700,
          userId: 1,
          theme: 'Rebalance',
          status: 'Proposed',
          consensusText: 'Shift 2% into bonds.',
          confidenceScore: 65,
          sourceAlertId: 501,
          linkedTaskId: null,
          createdAt: now,
        },
      ]),
      ...mockDashboardTasks([
        {
          taskId: 900,
          userId: 1,
          type: 'GoalAdjustment',
          title: 'Rebalance portfolio',
          description: 'Adjust allocation per advice.',
          priority: 'Medium',
          status: 'Pending',
          createdDate: now,
          dueDate: null,
          sourceAdviceId: 700,
          sourceAlertId: 501,
          progressPercentage: 0,
          confidenceScore: 70,
        },
      ]),
    );

    const service = getDashboardService();
    const data = await service.load();

    expect(data.netWorth.netWorth.amount).toBe(105_000);
    expect(data.accounts).toHaveLength(1);
    expect(data.insights[0]?.title).toContain('Rebalance');
    expect(data.alerts[0]?.alertId).toBe(501);
    expect(data.advice[0]?.adviceId).toBe(700);
    expect(data.tasks[0]?.taskId).toBe(900);
  });

  it('returns empty lists when downstream endpoints respond with 204', async () => {
    const now = '2025-10-08T14:30:00Z';
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
      ...mockDashboardAlerts([], { status: 204 }),
      ...mockDashboardAdvice([], { status: 204 }),
      ...mockDashboardTasks([], { status: 204 }),
    );

    const service = getDashboardService();
    const data = await service.load();

    expect(data.alerts).toEqual([]);
    expect(data.advice).toEqual([]);
    expect(data.tasks).toEqual([]);
  });

  it('surfaces summary fetch failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mswServer.use(
      http.get(summaryMatcher, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const service = getDashboardService();
    await expect(service.load()).rejects.toThrow(/Failed to fetch dashboard summary/);
    warnSpy.mockRestore();
  });
});
