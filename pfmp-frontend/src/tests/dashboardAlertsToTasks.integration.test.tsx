import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountInfo } from '@azure/msal-browser';
import Dashboard from '../views/Dashboard';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/auth/AuthContextObject';
import type { AuthContextType } from '../contexts/auth/types';
import { OnboardingContext } from '../onboarding/OnboardingContext.shared';
import type { OnboardingContextValue } from '../onboarding/OnboardingContext.shared';
import { sortedSteps } from '../onboarding/steps';
import { updateFlags } from '../flags/featureFlags';
import { __resetDashboardServiceForTest } from '../services/dashboard';
import { mswServer } from './mocks/server';
import { http, HttpResponse } from './mocks/handlers';

function createAuthContext(): AuthContextType {
  const account: AccountInfo = {
    homeAccountId: 'home-account',
    localAccountId: 'local-account',
    environment: 'test',
    tenantId: 'tenant',
    username: 'test.user@example.com',
    name: 'Test User',
    idTokenClaims: {},
  } as AccountInfo;

  return {
    isAuthenticated: true,
    user: account,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => 'test-token',
    loading: false,
    error: null,
    isDev: false,
    switchUser: () => {},
    availableUsers: [],
  } satisfies AuthContextType;
}

function createOnboardingContext(): OnboardingContextValue {
  const steps = sortedSteps();
  const completed = new Set(steps.map(step => step.id));
  const statuses = steps.reduce<OnboardingContextValue['statuses']>((acc, step) => {
    acc[step.id] = 'completed';
    return acc;
  }, {} as OnboardingContextValue['statuses']);
  return {
    userId: 1,
    steps,
    current: { id: steps[steps.length - 1].id, index: steps.length - 1, isFirst: false, isLast: true },
    completed,
    statuses,
    goNext: () => {},
    goPrev: () => {},
    markComplete: () => {},
    updateStatus: () => {},
    reset: async () => {},
    refresh: async () => {},
    progressPercent: 100,
    hydrated: true,
  } satisfies OnboardingContextValue;
}

function renderDashboard() {
  const authContext = createAuthContext();
  const onboardingContext = createOnboardingContext();

  return render(
    <MemoryRouter>
    <AuthContext.Provider value={authContext}>
      <OnboardingContext.Provider value={onboardingContext}>
        <Dashboard />
      </OnboardingContext.Provider>
    </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('DashboardWave4 alert to task handoff', () => {
  beforeEach(() => {
    updateFlags({
      enableDashboardWave4: true,
      onboarding_persistence_enabled: true,
      dashboard_wave4_real_data: true,
      use_simulated_auth: true,
    });
    __resetDashboardServiceForTest();
  });

  afterEach(() => {
    updateFlags({
      enableDashboardWave4: false,
      dashboard_wave4_real_data: false,
    });
    __resetDashboardServiceForTest();
    mswServer.resetHandlers();
  });

  it('creates a follow-up task and persists success', async () => {
    const now = '2025-10-08T12:00:00Z';
    let createdTaskPayload: unknown = null;
  const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

  mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({
          netWorth: {
            totalAssets: { amount: 125_000, currency: 'USD' },
            totalLiabilities: { amount: 40_000, currency: 'USD' },
            netWorth: { amount: 85_000, currency: 'USD' },
            lastUpdated: now,
          },
          accounts: [],
          insights: [],
        }),
      ),
      http.get(/\/api\/alerts/i, () =>
        HttpResponse.json([
          {
            alertId: 77,
            userId: 42,
            title: 'Contribution gap detected',
            message: '401(k) contributions are $150 below target.',
            severity: 'High',
            category: 'Portfolio',
            isActionable: true,
            portfolioImpactScore: 55,
            createdAt: now,
            isRead: false,
            isDismissed: false,
            expiresAt: null,
            actionUrl: null,
          },
        ]),
      ),
      http.get(/\/api\/advice/i, () => HttpResponse.json([])),
      http.get(/\/api\/tasks/i, () => HttpResponse.json([])),
      http.post(/\/api\/Tasks$/i, async ({ request }) => {
        createdTaskPayload = await request.json();
        return HttpResponse.json({ taskId: 907 }, { status: 200 });
      }),
    );

    const user = userEvent.setup();
    renderDashboard();

    try {
      const alertsPanel = await screen.findByTestId('alerts-panel');
      expect(alertsPanel).toBeInTheDocument();

      const createButton = screen.getByRole('button', { name: /create a follow-up task/i });
      await user.click(createButton);

      await screen.findByText(/Created task/i, {}, { timeout: 10_000 });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /create a follow-up task/i })).not.toBeInTheDocument();
      }, { timeout: 10_000 });

      const recentTaskCard = await screen.findByTestId('recent-task-card');
      expect(recentTaskCard).toHaveTextContent('Follow up: Contribution gap detected');
      expect(recentTaskCard).toContainElement(screen.getByTestId('new-task-indicator'));

      expect(createdTaskPayload).toMatchObject({
        userId: 42,
        title: 'Follow up: Contribution gap detected',
        description: '401(k) contributions are $150 below target.',
        priority: 3,
        sourceAlertId: 77,
        confidenceScore: 55,
        type: 1,
      });

      const emittedEvents = debugSpy.mock.calls.map(call => call[1]);
      expect(emittedEvents).toContain('alert_task_create_attempt');
      expect(emittedEvents).toContain('alert_task_create_success');
    } finally {
      debugSpy.mockRestore();
    }
  });

  it('rolls back optimistic task when creation fails', async () => {
    const now = '2025-10-08T12:15:00Z';
  const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

  mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({
          netWorth: {
            totalAssets: { amount: 90_000, currency: 'USD' },
            totalLiabilities: { amount: 30_000, currency: 'USD' },
            netWorth: { amount: 60_000, currency: 'USD' },
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
            title: 'High cash drag',
            message: 'Savings balance exceeds six-month runway.',
            severity: 'Medium',
            category: 'Cashflow',
            isActionable: true,
            portfolioImpactScore: 30,
            createdAt: now,
            isRead: false,
            isDismissed: false,
            expiresAt: null,
            actionUrl: null,
          },
        ]),
      ),
      http.get(/\/api\/advice/i, () => HttpResponse.json([])),
      http.get(/\/api\/tasks/i, () => HttpResponse.json([])),
      http.post(/\/api\/Tasks$/i, () =>
        HttpResponse.json({ message: 'failed' }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderDashboard();

    try {
      await screen.findByTestId('alerts-panel');
      const createButton = screen.getByRole('button', { name: /create a follow-up task/i });
      await user.click(createButton);

      await screen.findByText(/Couldn't save/i, {}, { timeout: 10_000 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create a follow-up task/i })).toBeEnabled();
      }, { timeout: 10_000 });

      await waitFor(() => {
        expect(screen.queryByTestId('recent-task-card')).not.toBeInTheDocument();
      }, { timeout: 10_000 });

      expect(screen.getByTestId('tasks-panel')).toHaveTextContent('No tasks yet');

      const emittedEvents = debugSpy.mock.calls.map(call => call[1]);
      expect(emittedEvents).toContain('alert_task_create_attempt');
      expect(emittedEvents).toContain('alert_task_create_failure');
    } finally {
      debugSpy.mockRestore();
    }
  });
});
