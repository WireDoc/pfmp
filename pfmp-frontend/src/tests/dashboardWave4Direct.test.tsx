import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { AuthProvider } from '../contexts/AuthContext';
import DashboardWave4 from '../views/DashboardWave4';
import { updateFlags } from '../flags/featureFlags';
import {
  mockDashboardSummary,
  mockDashboardAlerts,
  mockDashboardAdvice,
  mockDashboardTasks,
  http,
  HttpResponse,
} from './mocks/handlers';
import { mswServer } from './mocks/server';
import { __resetDashboardServiceForTest } from '../services/dashboard';

function renderDashboard() {
  act(() => {
    updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false, dashboard_wave4_real_data: false });
  });
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <DashboardWave4 />
      </OnboardingProvider>
    </AuthProvider>
  );
}

interface ApiFixture {
  summary: Parameters<typeof mockDashboardSummary>[0];
  alerts?: Parameters<typeof mockDashboardAlerts>[0];
  advice?: Parameters<typeof mockDashboardAdvice>[0];
  tasks?: Parameters<typeof mockDashboardTasks>[0];
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if ('url' in input && typeof input.url === 'string') return input.url;
  return String(input);
}

function renderDashboardWithRealData({ summary, alerts, advice, tasks }: ApiFixture) {
  act(() => {
    updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false, dashboard_wave4_real_data: true });
  });
  __resetDashboardServiceForTest();
  mswServer.use(
    ...mockDashboardSummary(summary),
  );
  const originalFetch = global.fetch;
  vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = extractUrl(input);
    const jsonResponse = (payload: unknown) => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    if (url.includes('/api/alerts')) {
      return jsonResponse(alerts ?? []);
    }
    if (url.includes('/api/Advice/user')) {
      return jsonResponse(advice ?? []);
    }
    if (url.includes('/api/Tasks')) {
      return jsonResponse(tasks ?? []);
    }
    return originalFetch(input as any, init);
  });
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <DashboardWave4 />
      </OnboardingProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  __resetDashboardServiceForTest();
});

afterEach(() => {
  mswServer.resetHandlers();
  act(() => {
    updateFlags({ dashboard_wave4_real_data: false, enableDashboardWave4: false });
  });
  vi.restoreAllMocks();
});

describe('DashboardWave4 direct component render', () => {
  it('renders root test id and basic sections', async () => {
    renderDashboard();
    const root = await screen.findByTestId('wave4-dashboard-root');
    expect(root).toBeInTheDocument();
    expect(screen.getByText(/Dashboard \(Wave 4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, John Smith/)).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-summary-text').textContent).toContain('Onboarding complete');
    expect(await screen.findByTestId('alerts-panel')).toBeInTheDocument();
    expect(screen.getByText(/High credit utilization/)).toBeInTheDocument();
    expect(await screen.findByTestId('advice-panel')).toBeInTheDocument();
  expect(screen.getByText(/Your equity allocation is slightly above target/)).toBeInTheDocument();
    expect(await screen.findByTestId('tasks-panel')).toBeInTheDocument();
  expect(screen.getByText(/Rebalance equity allocation/)).toBeInTheDocument();
    // Loading skeleton first then data; allow a tick
  });

  it('renders real data when API summary succeeds', async () => {
    renderDashboardWithRealData({
      summary: {
        netWorth: {
          totalAssets: { amount: 250000, currency: 'USD' },
          totalLiabilities: { amount: 50000, currency: 'USD' },
          netWorth: { amount: 200000, currency: 'USD' },
          change30dPct: 1.25,
          lastUpdated: '2025-10-07T00:00:00Z',
        },
        accounts: [
          {
            id: 'acct-1',
            name: 'Fidelity Brokerage',
            institution: 'Fidelity',
            type: 'brokerage',
            balance: { amount: 654321, currency: 'USD' },
            syncStatus: 'ok',
            lastSync: '2025-10-07T00:00:00Z',
          },
        ],
        insights: [
          {
            id: 'insight-1',
            category: 'allocation',
            title: 'Rebalance recommended',
            body: 'Shift 3% from equities into bonds.',
            severity: 'info',
            generatedAt: '2025-10-07T00:00:00Z',
          },
        ],
      },
      alerts: [
        {
          alertId: 88,
          userId: 1,
          title: 'Portfolio drift detected',
          message: 'Equity exposure exceeds policy band.',
          severity: 'High',
          category: 'Portfolio',
          isActionable: true,
          portfolioImpactScore: 70,
          createdAt: '2025-10-07T00:00:00Z',
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
          theme: 'Rebalance',
          status: 'Proposed',
          consensusText: 'Shift 3% from equities into bonds.',
          confidenceScore: 82,
          sourceAlertId: 88,
          linkedTaskId: 990,
          createdAt: '2025-10-07T00:00:00Z',
        },
      ],
      tasks: [
        {
          taskId: 990,
          userId: 1,
          type: 'Rebalance',
          title: 'Execute equity rebalance',
          description: 'Move 3% allocation into bonds via target date fund.',
          priority: 'High',
          status: 'Pending',
          createdDate: '2025-10-07T00:00:00Z',
          dueDate: null,
          sourceAdviceId: 101,
          sourceAlertId: 88,
          progressPercentage: 10,
          confidenceScore: 75,
        },
      ],
    });

    expect(await screen.findByText('$200,000')).toBeInTheDocument();
    expect(screen.getByText(/Fidelity Brokerage/)).toBeInTheDocument();
    expect(screen.getByText(/Rebalance recommended/)).toBeInTheDocument();
    expect(screen.getByText(/Portfolio drift detected/)).toBeInTheDocument();
    expect(screen.getByText(/Execute equity rebalance/)).toBeInTheDocument();
  });

  it('shows empty states when summary returns no accounts or insights', async () => {
    renderDashboardWithRealData({
      summary: {
        netWorth: {
          totalAssets: { amount: 1000, currency: 'USD' },
          totalLiabilities: { amount: 100, currency: 'USD' },
          netWorth: { amount: 900, currency: 'USD' },
          lastUpdated: '2025-10-07T01:00:00Z',
        },
        accounts: [],
        insights: [],
      },
    });

    expect(await screen.findByText('$900')).toBeInTheDocument();
    expect(await screen.findByText('No accounts')).toBeInTheDocument();
    expect(screen.getByText('No insights')).toBeInTheDocument();
    expect(screen.getByText('No active alerts')).toBeInTheDocument();
    expect(screen.getByText('No advice generated yet')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('surfaces error state when summary request fails', async () => {
    act(() => {
      updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false, dashboard_wave4_real_data: true });
    });
    __resetDashboardServiceForTest();
    mswServer.use(
      http.get('http://localhost/api/dashboard/summary', () =>
        HttpResponse.json({ message: 'fail' }, { status: 500 }),
      ),
    );

    render(
      <AuthProvider>
        <OnboardingProvider testCompleteAll skipAutoHydrate>
          <DashboardWave4 />
        </OnboardingProvider>
      </AuthProvider>
    );

    expect(await screen.findByText('Failed to load dashboard data')).toBeInTheDocument();
  });

  it('optimistically creates a follow-up task from an actionable alert', async () => {
  renderDashboard();

  const alertsPanel = await screen.findByTestId('alerts-panel');
  const tasksPanel = await screen.findByTestId('tasks-panel');
  const createTaskButton = within(alertsPanel).getByRole('button', { name: /create a follow-up task to track this alert/i });
    fireEvent.click(createTaskButton);

    expect(screen.getByText('Follow up: High credit utilization')).toBeInTheDocument();
    expect(within(tasksPanel).getByTestId('recent-task-card')).toBeInTheDocument();
    expect(screen.getByText(/Linked task #\d+/)).toBeInTheDocument();
    expect(screen.getByText(/Rebalance equity allocation/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create follow-up task/i })).not.toBeInTheDocument();
    });
  });
});
