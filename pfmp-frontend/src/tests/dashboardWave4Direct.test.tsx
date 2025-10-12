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
import type { DashboardService } from '../services/dashboard';
import * as mockDashboardService from '../services/dashboard/mockDashboardService';

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

interface RealDataOptions {
  handleCreateTask?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if ('url' in input && typeof input.url === 'string') return input.url;
  return String(input);
}

function renderDashboardWithRealData({ summary, alerts, advice, tasks }: ApiFixture, options?: RealDataOptions) {
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
    if (url.includes('/api/Tasks') && init?.method?.toUpperCase() === 'POST') {
      if (options?.handleCreateTask) {
        return options.handleCreateTask(input, init);
      }
      return jsonResponse({ taskId: 90210 });
    }
    if (url.includes('/api/alerts')) {
      return jsonResponse(alerts ?? []);
    }
    if (url.includes('/api/Advice/user')) {
      return jsonResponse(advice ?? []);
    }
    if (url.includes('/api/Tasks')) {
      return jsonResponse(tasks ?? []);
    }
    if (originalFetch) {
      return originalFetch(input, init);
    }
    return Promise.reject(new Error('No fetch available'));
  });
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <DashboardWave4 />
      </OnboardingProvider>
    </AuthProvider>
  );
}

function stubMockDashboardService(overrides?: Partial<DashboardService>) {
  const base = mockDashboardService.createMockDashboardService({ latencyMs: 0 });
  const stub = { ...base, ...overrides } satisfies DashboardService;
  vi.spyOn(mockDashboardService, 'createMockDashboardService').mockImplementation(() => stub);
  return stub;
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
    const quickGlanceHeading = await screen.findByText('Quick glance');
    expect(quickGlanceHeading).toBeInTheDocument();
  const quickStatsPanel = await screen.findByTestId('quick-stats-panel');
    const netWorthLabel = await within(quickStatsPanel).findByText(/30-day net worth change/i);
    const tasksLabel = await within(quickStatsPanel).findByText(/Tasks & follow-ups/i);
  const obligationsLabel = await within(quickStatsPanel).findByText(/Next milestone/i);
    const obligationsSummary = await within(quickStatsPanel).findByText(/3 active · \$120,000/);

  const netWorthValue = netWorthLabel.nextElementSibling as HTMLElement | null;
  expect(netWorthValue).not.toBeNull();
  expect(netWorthValue?.textContent?.trim()).toMatch(/%/);
  expect(tasksLabel).toBeInTheDocument();
  const tasksValue = tasksLabel.nextElementSibling as HTMLElement | null;
  expect(tasksValue).not.toBeNull();
  expect(tasksValue?.textContent?.trim()).toMatch(/outstanding/i);
  expect(obligationsLabel).toBeInTheDocument();
    expect(obligationsSummary).toBeInTheDocument();
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
        longTermObligationCount: 1,
        longTermObligationEstimate: 4500,
        nextObligationDueDate: '2025-12-01T00:00:00Z',
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

  expect(await screen.findAllByText('$200,000')).not.toHaveLength(0);
  expect(screen.getByText(/Quick glance/)).toBeInTheDocument();
  const quickStatsPanel = await screen.findByTestId('quick-stats-panel');
  expect(await within(quickStatsPanel).findByText(/30-day net worth change/i)).toBeInTheDocument();
  expect(await within(quickStatsPanel).findByText(/1 outstanding/i)).toBeInTheDocument();
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

    expect(await screen.findAllByText('$900')).not.toHaveLength(0);
    expect(await screen.findByText('No accounts')).toBeInTheDocument();
    expect(screen.getByText('No insights')).toBeInTheDocument();
    expect(screen.getByText('No active alerts')).toBeInTheDocument();
    expect(screen.getByText('No advice generated yet')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('adds derived insights when long-term obligations summary data is present', async () => {
    const futureDueDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();

    renderDashboardWithRealData({
      summary: {
        netWorth: {
          totalAssets: { amount: 150000, currency: 'USD' },
          totalLiabilities: { amount: 40000, currency: 'USD' },
          netWorth: { amount: 110000, currency: 'USD' },
          lastUpdated: new Date().toISOString(),
        },
        accounts: [],
        insights: [],
        longTermObligationCount: 2,
        longTermObligationEstimate: 20000,
        nextObligationDueDate: futureDueDate,
      },
      alerts: [],
      advice: [],
      tasks: [],
    });

    expect(await screen.findByText('Obligation milestone coming up')).toBeInTheDocument();
  expect(screen.getByText(/Set aside \$20,000 so cash flow stays aligned/)).toBeInTheDocument();
    expect(screen.getByText(/Plan on roughly \$10,000 per obligation/)).toBeInTheDocument();
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

  it('persists follow-up tasks via API when real data flag is enabled', async () => {
    const createTaskHandler = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBeDefined();
      if (init?.body) {
        const parsed = JSON.parse(init.body.toString());
        expect(parsed).toMatchObject({
          title: expect.stringContaining('Portfolio drift detected'),
          userId: 1,
          sourceAlertId: 88,
        });
      }
      return new Response(JSON.stringify({ taskId: 4321 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    renderDashboardWithRealData({
      summary: {
        netWorth: {
          totalAssets: { amount: 250000, currency: 'USD' },
          totalLiabilities: { amount: 50000, currency: 'USD' },
          netWorth: { amount: 200000, currency: 'USD' },
          lastUpdated: '2025-10-07T00:00:00Z',
        },
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
          linkedTaskId: null,
          createdAt: '2025-10-07T00:00:00Z',
        },
      ],
      tasks: [],
    }, { handleCreateTask: createTaskHandler });

    const alertsPanel = await screen.findByTestId('alerts-panel');
    const tasksPanel = await screen.findByTestId('tasks-panel');
    const createTaskButton = within(alertsPanel).getByRole('button', { name: /create a follow-up task to track this alert/i });
    fireEvent.click(createTaskButton);

    await waitFor(() => expect(createTaskHandler).toHaveBeenCalled());

    await waitFor(() => {
      expect(within(tasksPanel).getByText('Follow up: Portfolio drift detected')).toBeInTheDocument();
      expect(screen.getByText('Linked task #4321')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create follow-up task/i })).not.toBeInTheDocument();
    });
  });

  it('reverts optimistic follow-up task when API persistence fails', async () => {
    const failingCreateTask = vi.fn(async () => new Response(JSON.stringify({ message: 'nope' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));

    renderDashboardWithRealData({
      summary: {
        netWorth: {
          totalAssets: { amount: 100000, currency: 'USD' },
          totalLiabilities: { amount: 10000, currency: 'USD' },
          netWorth: { amount: 90000, currency: 'USD' },
          lastUpdated: '2025-10-07T00:00:00Z',
        },
      },
      alerts: [
        {
          alertId: 77,
          userId: 1,
          title: 'High utilization detected',
          message: 'Utilization at 50% exceeds target.',
          severity: 'High',
          category: 'Cashflow',
          isActionable: true,
          portfolioImpactScore: 60,
          createdAt: '2025-10-07T00:00:00Z',
          isRead: false,
          isDismissed: false,
          expiresAt: null,
          actionUrl: null,
        },
      ],
      advice: [
        {
          adviceId: 222,
          userId: 1,
          theme: 'Cashflow',
          status: 'Proposed',
          consensusText: 'Consider reducing discretionary expenses.',
          confidenceScore: 55,
          sourceAlertId: 77,
          linkedTaskId: null,
          createdAt: '2025-10-07T00:00:00Z',
        },
      ],
      tasks: [],
    }, { handleCreateTask: failingCreateTask });

    const alertsPanel = await screen.findByTestId('alerts-panel');
    const createTaskButton = within(alertsPanel).getByRole('button', { name: /create a follow-up task to track this alert/i });
    fireEvent.click(createTaskButton);

    await waitFor(() => expect(failingCreateTask).toHaveBeenCalled());

    await waitFor(() => {
      expect(screen.queryByText('Follow up: High utilization detected')).not.toBeInTheDocument();
      expect(within(alertsPanel).getByRole('button', { name: /create a follow-up task to track this alert/i })).toBeInTheDocument();
    });

    expect(await screen.findByText(/Couldn't save “High utilization detected”/)).toBeInTheDocument();
  });

  it('updates task status optimistically and clears pending state when persistence succeeds', async () => {
    stubMockDashboardService();

    renderDashboard();

    const tasksPanel = await screen.findByTestId('tasks-panel');
    expect(within(tasksPanel).getByText('Rebalance equity allocation')).toBeInTheDocument();
    expect(within(tasksPanel).getByText('Pending')).toBeInTheDocument();

    const startButton = within(tasksPanel).getByTestId('task-action-start-555');
    fireEvent.click(startButton);

    expect(within(tasksPanel).getByText('InProgress')).toBeInTheDocument();
    const completeButton = within(tasksPanel).getByTestId('task-action-complete-555');
    expect(completeButton).toBeDisabled();

    await waitFor(() => expect(completeButton).not.toBeDisabled());
    await screen.findByText('Updated “Rebalance equity allocation”');
  });

  it('reverts task status when persistence fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubMockDashboardService({
      updateTaskStatus: async () => {
        throw new Error('nope');
      },
    });

    renderDashboard();

    const tasksPanel = await screen.findByTestId('tasks-panel');
    const startButton = within(tasksPanel).getByTestId('task-action-start-555');
    fireEvent.click(startButton);

    expect(within(tasksPanel).getByText('InProgress')).toBeInTheDocument();

    await waitFor(() => expect(within(tasksPanel).getByText('Pending')).toBeInTheDocument());
  expect(await screen.findByText("Couldn't update “Rebalance equity allocation”. Please try again.")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('updates task progress and derives status from slider interaction', async () => {
    const updateProgress = vi.fn(async () => {});
    stubMockDashboardService({ updateTaskProgress: updateProgress });

    renderDashboard();

    const tasksPanel = await screen.findByTestId('tasks-panel');
    const sliderRoot = within(tasksPanel).getByTestId('task-progress-slider-555');
  const rectSpy = vi.spyOn(sliderRoot, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 16,
      top: 0,
      left: 0,
      right: 200,
      bottom: 16,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.mouseDown(sliderRoot, { clientX: 0 });
    fireEvent.mouseMove(document.body, { clientX: 100 });
    fireEvent.mouseUp(document.body, { clientX: 100 });

    await waitFor(() => expect(updateProgress).toHaveBeenCalledWith({ taskId: 555, progressPercentage: 50 }));
    await waitFor(() => expect(within(tasksPanel).getByText('InProgress')).toBeInTheDocument());
    await waitFor(() => expect(within(tasksPanel).getByText('50%')).toBeInTheDocument());
    await screen.findByText('Updated progress for “Rebalance equity allocation”');

    rectSpy.mockRestore();
  });

  it('reverts task progress when persistence fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingProgress = vi.fn(async () => {
      throw new Error('nope');
    });
    stubMockDashboardService({ updateTaskProgress: failingProgress });

    renderDashboard();

    const tasksPanel = await screen.findByTestId('tasks-panel');
    const sliderRoot = within(tasksPanel).getByTestId('task-progress-slider-555');
  const rectSpy = vi.spyOn(sliderRoot, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 16,
      top: 0,
      left: 0,
      right: 200,
      bottom: 16,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.mouseDown(sliderRoot, { clientX: 0 });
    fireEvent.mouseMove(document.body, { clientX: 100 });
    fireEvent.mouseUp(document.body, { clientX: 100 });

  await waitFor(() => expect(failingProgress).toHaveBeenCalled());
  await waitFor(() => expect(within(tasksPanel).getByText('Pending')).toBeInTheDocument());
  await waitFor(() => expect(within(tasksPanel).getByText('0%')).toBeInTheDocument());
    expect(await screen.findByText("Couldn't update progress for “Rebalance equity allocation”. Please try again.")).toBeInTheDocument();

    consoleSpy.mockRestore();
    rectSpy.mockRestore();
  });

  it('updates quick glance metrics when obligation watcher emits new data', async () => {
    const upcomingDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    const laterDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    let emitUpdate: ((summary: { count: number; totalEstimate: number; nextDueDate: string | null }) => void) | null = null;

    stubMockDashboardService({
      subscribeToLongTermObligations: (listener) => {
        emitUpdate = listener;
        listener({ count: 3, totalEstimate: 120_000, nextDueDate: upcomingDate });
        return () => {
          emitUpdate = null;
        };
      },
    });

    renderDashboard();

    const quickStatsPanel = await screen.findByTestId('quick-stats-panel');
    await within(quickStatsPanel).findByText(/3 active · \$120,000/);

    expect(emitUpdate).not.toBeNull();
    act(() => {
      emitUpdate?.({ count: 5, totalEstimate: 150_000, nextDueDate: laterDate });
    });

    await waitFor(() => {
      expect(within(quickStatsPanel).getByText(/5 active · \$150,000/)).toBeInTheDocument();
    });
  });
});
