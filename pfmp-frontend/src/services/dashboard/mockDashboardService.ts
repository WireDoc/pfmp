import { DashboardService, DashboardData } from './types';

interface MockOptions {
  latencyMs?: number;
  errorRate?: number; // 0..1 chance
}

const defaultOpts: Required<Pick<MockOptions, 'latencyMs' | 'errorRate'>> = {
  latencyMs: 250,
  errorRate: 0,
};

function generateData(): DashboardData {
  const now = new Date().toISOString();
  const totalAssets = 250_000;
  const totalLiabilities = 67_500;
  const netWorth = totalAssets - totalLiabilities;

  return {
    netWorth: {
      totalAssets: { amount: totalAssets, currency: 'USD' },
      totalLiabilities: { amount: totalLiabilities, currency: 'USD' },
      netWorth: { amount: netWorth, currency: 'USD' },
      change1dPct: 0.42,
      change30dPct: 2.05,
      lastUpdated: now,
    },
    accounts: [
      {
        id: 'acct_broker_1',
        name: 'Brokerage - Core',
        institution: 'Fidelity',
        type: 'brokerage',
        balance: { amount: 123_400, currency: 'USD' },
        syncStatus: 'ok',
        lastSync: now,
      },
      {
        id: 'acct_bank_1',
        name: 'Checking',
        institution: 'Chase',
        type: 'bank',
        balance: { amount: 8_400, currency: 'USD' },
        syncStatus: 'ok',
        lastSync: now,
      },
      {
        id: 'acct_cc_1',
        name: 'Visa Rewards',
        institution: 'Chase',
        type: 'credit',
        balance: { amount: -1_200, currency: 'USD' },
        syncStatus: 'pending',
        lastSync: now,
      },
    ],
    insights: [
      {
        id: 'insight_alloc_1',
        category: 'allocation',
        title: 'Equity allocation slightly high',
        body: 'Current equity exposure is 73% vs target 70%. Consider incremental rebalance.',
        severity: 'info',
        generatedAt: now,
      },
      {
        id: 'insight_cash_1',
        category: 'cashflow',
        title: 'Surplus cash idle',
        body: 'Checking avg balance exceeds typical spend buffer by $4,000.',
        severity: 'warn',
        generatedAt: now,
      },
    ],
    alerts: [
      {
        alertId: 42,
        userId: 1,
        title: 'High credit utilization',
        message: 'Visa Rewards utilization is 43% of limit.',
        severity: 'High',
        category: 'Portfolio',
        isActionable: true,
        portfolioImpactScore: 68,
        createdAt: now,
        isRead: false,
        isDismissed: false,
        expiresAt: null,
        actionUrl: null,
      },
    ],
    advice: [
      {
        adviceId: 101,
        userId: 1,
        theme: 'General',
        status: 'Proposed',
        consensusText: 'Your equity allocation is slightly above target.',
        confidenceScore: 60,
        sourceAlertId: 42,
        linkedTaskId: null,
        createdAt: now,
      },
    ],
    tasks: [
      {
        taskId: 555,
        userId: 1,
        type: 'GoalAdjustment',
        title: 'Rebalance equity allocation',
        description: 'Shift 3% from equities into bonds.',
        priority: 'Medium',
        status: 'Pending',
        createdDate: now,
        dueDate: null,
        sourceAdviceId: 101,
        sourceAlertId: 42,
        progressPercentage: 0,
        confidenceScore: 70,
      },
    ],
  };
}

export function createMockDashboardService(opts: MockOptions = {}): DashboardService {
  const { latencyMs, errorRate } = { ...defaultOpts, ...opts };
  return {
    async load() {
      if (latencyMs) await new Promise(r => setTimeout(r, latencyMs));
      if (errorRate > 0 && Math.random() < errorRate) {
        throw new Error('Mock dashboard service simulated failure');
      }
      return generateData();
    },
  };
}
