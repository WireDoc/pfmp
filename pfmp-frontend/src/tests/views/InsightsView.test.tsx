import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mswServer } from '../mocks/server';
import { mockDashboardSummary, mockDashboardAlerts, mockDashboardAdvice, mockDashboardTasks, http, HttpResponse } from '../mocks/handlers';
import { __resetDashboardServiceForTest } from '../../services/dashboard';
import { InsightsView } from '../../views/dashboard/InsightsView';

// Mock devUserState — must include getDevUserId for apiDashboardService
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

// Mock adviceService
const mockAccept = vi.fn().mockResolvedValue({});
const mockDismiss = vi.fn().mockResolvedValue({});
vi.mock('../../services/api', () => ({
  adviceService: {
    accept: (...args: unknown[]) => mockAccept(...args),
    dismiss: (...args: unknown[]) => mockDismiss(...args),
  },
}));

const baseSummary = {
  netWorth: { totalAssets: 200000, totalLiabilities: 50000, netWorth: 150000, lastUpdated: '2026-04-01' },
  accounts: [],
  insights: [
    { id: 'ins-1', category: 'cashflow', title: 'Cash flow positive', body: 'Your income exceeds expenses by $2,000/month', severity: 'info', generatedAt: '2026-04-01T12:00:00Z' },
    { id: 'ins-2', category: 'risk', title: 'Risk tolerance mismatch', body: 'Portfolio is more aggressive than your risk profile', severity: 'warn', generatedAt: '2026-04-01T12:00:00Z' },
  ],
  alerts: [],
  advice: [],
  tasks: [],
};

const sampleAdvice = [
  { adviceId: 1, userId: 20, theme: 'Cash Optimization', status: 'Proposed', consensusText: 'Move $5,000 from checking to high-yield savings for better returns.', confidenceScore: 0.85, createdAt: '2026-04-01T10:00:00Z', linkedTaskId: null, sourceAlertId: null },
  { adviceId: 2, userId: 20, theme: 'Portfolio', status: 'Proposed', consensusText: 'Rebalance TSP to increase C Fund allocation by 10%.', confidenceScore: 0.72, createdAt: '2026-03-30T10:00:00Z', linkedTaskId: null, sourceAlertId: null },
];

function setupMsw(overrides?: { advice?: typeof sampleAdvice; insights?: typeof baseSummary.insights }) {
  __resetDashboardServiceForTest();
  const summary = { ...baseSummary, insights: overrides?.insights ?? baseSummary.insights };
  mswServer.use(
    ...mockDashboardSummary(summary),
    ...mockDashboardAdvice(overrides?.advice ?? []),
    ...mockDashboardAlerts([]),
    ...mockDashboardTasks([]),
  );
}

function renderInsightsView() {
  return render(
    <MemoryRouter>
      <InsightsView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InsightsView', () => {
  it('renders the page heading', async () => {
    setupMsw();
    renderInsightsView();
    expect(await screen.findByText(/insights.*ai analysis/i)).toBeInTheDocument();
  });

  it('shows 3 tabs: Run Analysis, Advice, Insights', async () => {
    setupMsw();
    renderInsightsView();
    await screen.findByText(/insights.*ai analysis/i);

    expect(screen.getByRole('tab', { name: /run analysis/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /advice/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /insights/i })).toBeInTheDocument();
  });

  it('shows 5 analysis type cards on Run Analysis tab', async () => {
    setupMsw();
    renderInsightsView();

    expect(await screen.findByText('Cash Optimization')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Rebalancing')).toBeInTheDocument();
    expect(screen.getByText('TSP Analysis')).toBeInTheDocument();
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    expect(screen.getByText('Full Analysis')).toBeInTheDocument();
  });

  it('shows Run Analysis buttons', async () => {
    setupMsw();
    renderInsightsView();
    await screen.findByText('Cash Optimization');

    const buttons = screen.getAllByRole('button', { name: /run analysis/i });
    expect(buttons.length).toBe(5);
  });

  it('calls AI endpoint when Run Analysis is clicked', async () => {
    setupMsw();
    let aiCalled = false;
    mswServer.use(
      http.post(/\/ai\/analyze\/\d+\/cash-optimization/, () => {
        aiCalled = true;
        return HttpResponse.json({ summary: 'Analysis complete', alertsGenerated: 2, adviceGenerated: 1, totalTokens: 5000, totalCost: 0.02 });
      }),
    );

    const user = userEvent.setup();
    renderInsightsView();
    await screen.findByText('Cash Optimization');

    const buttons = screen.getAllByRole('button', { name: /run analysis/i });
    await user.click(buttons[0]); // Cash Optimization

    await waitFor(() => {
      expect(aiCalled).toBe(true);
    });
  });

  it('shows success after analysis completes', async () => {
    setupMsw();
    mswServer.use(
      http.post(/\/ai\/analyze\/\d+\/cash-optimization/, () =>
        HttpResponse.json({ summary: 'Move funds to high-yield savings', alertsGenerated: 1, adviceGenerated: 1, totalTokens: 3000, totalCost: 0.01 })
      ),
    );

    const user = userEvent.setup();
    renderInsightsView();
    await screen.findByText('Cash Optimization');

    const buttons = screen.getAllByRole('button', { name: /run analysis/i });
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText(/move funds to high-yield savings/i)).toBeInTheDocument();
    });
  });

  it('shows error when analysis fails', async () => {
    setupMsw();
    mswServer.use(
      http.post(/\/ai\/analyze\/\d+\/cash-optimization/, () =>
        new HttpResponse(null, { status: 500 })
      ),
    );

    const user = userEvent.setup();
    renderInsightsView();
    await screen.findByText('Cash Optimization');

    const buttons = screen.getAllByRole('button', { name: /run analysis/i });
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/analysis failed/i).length).toBeGreaterThan(0);
    });
  });

  it('switches to Advice tab and shows advice items', async () => {
    setupMsw({ advice: sampleAdvice });
    const user = userEvent.setup();
    renderInsightsView();

    const adviceTab = await screen.findByRole('tab', { name: /advice/i });
    await user.click(adviceTab);

    await waitFor(() => {
      expect(screen.getByText(/move \$5,000 from checking/i)).toBeInTheDocument();
      expect(screen.getByText(/rebalance tsp/i)).toBeInTheDocument();
    });
  });

  it('shows accept/dismiss buttons for proposed advice', async () => {
    setupMsw({ advice: sampleAdvice });
    const user = userEvent.setup();
    renderInsightsView();

    const adviceTab = await screen.findByRole('tab', { name: /advice/i });
    await user.click(adviceTab);

    await waitFor(() => {
      const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
      expect(acceptButtons.length).toBe(2);
      expect(dismissButtons.length).toBe(2);
    });
  });

  it('calls adviceService.accept when Accept is clicked', async () => {
    setupMsw({ advice: sampleAdvice });
    const user = userEvent.setup();
    renderInsightsView();

    const adviceTab = await screen.findByRole('tab', { name: /advice/i });
    await user.click(adviceTab);

    const acceptButtons = await screen.findAllByRole('button', { name: /accept/i });
    await user.click(acceptButtons[0]);

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith(1);
    });
  });

  it('calls adviceService.dismiss when Dismiss is clicked', async () => {
    setupMsw({ advice: sampleAdvice });
    const user = userEvent.setup();
    renderInsightsView();

    const adviceTab = await screen.findByRole('tab', { name: /advice/i });
    await user.click(adviceTab);

    const dismissButtons = await screen.findAllByRole('button', { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    await waitFor(() => {
      expect(mockDismiss).toHaveBeenCalledWith(1);
    });
  });

  it('switches to Insights tab and shows insight cards', async () => {
    setupMsw();
    const user = userEvent.setup();
    renderInsightsView();

    const insightsTab = await screen.findByRole('tab', { name: /insights/i });
    await user.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('Cash flow positive')).toBeInTheDocument();
      expect(screen.getByText('Risk tolerance mismatch')).toBeInTheDocument();
    });
  });

  it('shows empty state on Advice tab when no advice exists', async () => {
    setupMsw({ advice: [] });
    const user = userEvent.setup();
    renderInsightsView();

    const adviceTab = await screen.findByRole('tab', { name: /advice/i });
    await user.click(adviceTab);

    await waitFor(() => {
      expect(screen.getByText(/no active advice/i)).toBeInTheDocument();
    });
  });

  it('shows empty state on Insights tab when no insights exist', async () => {
    setupMsw({ insights: [] });
    const user = userEvent.setup();
    renderInsightsView();

    const insightsTab = await screen.findByRole('tab', { name: /insights/i });
    await user.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText(/no insights generated/i)).toBeInTheDocument();
    });
  });
});
