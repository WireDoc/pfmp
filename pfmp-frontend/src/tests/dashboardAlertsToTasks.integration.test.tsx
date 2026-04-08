import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

describe('Dashboard alert to advice to task workflow', () => {
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

  it('generates advice from an alert, then accepts to create a task', async () => {
    const now = '2025-10-08T12:00:00Z';
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
      http.post(/\/api\/Alerts\/77\/generate-advice$/i, () =>
        HttpResponse.json({
          adviceId: 501,
          userId: 42,
          theme: 'Rebalancing',
          status: 'Proposed',
          consensusText: 'Consider increasing your 401(k) contributions by $150/month to close the gap.',
          confidenceScore: 88,
          sourceAlertId: 77,
          linkedTaskId: null,
          createdAt: now,
          updatedAt: now,
        }),
      ),
      http.post(/\/api\/Advice\/501\/accept$/i, () =>
        HttpResponse.json({
          adviceId: 501,
          userId: 42,
          theme: 'Rebalancing',
          status: 'Accepted',
          consensusText: 'Consider increasing your 401(k) contributions by $150/month to close the gap.',
          confidenceScore: 88,
          sourceAlertId: 77,
          linkedTaskId: 907,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    const user = userEvent.setup();
    renderDashboard();

    try {
      // Wait for the alerts panel to render
      const alertsPanel = await screen.findByTestId('alerts-panel');
      expect(alertsPanel).toBeInTheDocument();

      // Click "Get AI Advice" button
      const adviceButton = await screen.findByRole('button', { name: /get ai advice/i });
      await user.click(adviceButton);

      // Should show toast about advice generated
      await screen.findByText(/ai advice generated/i, {}, { timeout: 10_000 });

      // The advice panel should now show the new advice
      await waitFor(() => {
        expect(screen.getByText(/rebalancing/i)).toBeInTheDocument();
      }, { timeout: 10_000 });

      // Now accept the advice
      const acceptButton = await screen.findByRole('button', { name: /accept/i });
      await user.click(acceptButton);

      // Should show toast about task creation
      await screen.findByText(/advice accepted/i, {}, { timeout: 10_000 });

      // Verify telemetry events
      const emittedEvents = debugSpy.mock.calls.map(call => call[1]);
      expect(emittedEvents).toContain('advice_generate_attempt');
      expect(emittedEvents).toContain('advice_generate_success');
      expect(emittedEvents).toContain('advice_accept_attempt');
      expect(emittedEvents).toContain('advice_accept_success');
    } finally {
      debugSpy.mockRestore();
    }
  }, 15_000);

  it('shows error toast when advice generation fails', async () => {
    const now = '2025-10-08T12:15:00Z';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
      http.post(/\/api\/Alerts\/88\/generate-advice$/i, () =>
        HttpResponse.json({ message: 'AI service unavailable' }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderDashboard();

    try {
      await screen.findByTestId('alerts-panel');
      const adviceButton = await screen.findByRole('button', { name: /get ai advice/i });
      await user.click(adviceButton);

      // Should show error toast
      await screen.findByText(/couldn't generate advice/i, {}, { timeout: 10_000 });

      // Button should still be available for retry
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get ai advice/i })).toBeEnabled();
      }, { timeout: 10_000 });

      const emittedEvents = debugSpy.mock.calls.map(call => call[1]);
      expect(emittedEvents).toContain('advice_generate_attempt');
      expect(emittedEvents).toContain('advice_generate_failure');
    } finally {
      debugSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 15_000);

  it('dismisses advice and shows status chip', async () => {
    const now = '2025-10-08T12:30:00Z';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    mswServer.use(
      http.get(/\/api\/dashboard\/summary$/, () =>
        HttpResponse.json({
          netWorth: {
            totalAssets: { amount: 100_000, currency: 'USD' },
            totalLiabilities: { amount: 20_000, currency: 'USD' },
            netWorth: { amount: 80_000, currency: 'USD' },
            lastUpdated: now,
          },
          accounts: [],
          insights: [],
        }),
      ),
      http.get(/\/api\/alerts/i, () => HttpResponse.json([])),
      http.get(/\/api\/advice/i, () =>
        HttpResponse.json([
          {
            adviceId: 600,
            userId: 1,
            theme: 'Tax',
            status: 'Proposed',
            consensusText: 'Consider harvesting losses in your taxable brokerage account.',
            confidenceScore: 76,
            sourceAlertId: 99,
            linkedTaskId: null,
            createdAt: now,
          },
        ]),
      ),
      http.get(/\/api\/tasks/i, () => HttpResponse.json([])),
      http.post(/\/api\/Advice\/600\/dismiss$/i, () =>
        HttpResponse.json({
          adviceId: 600,
          userId: 1,
          theme: 'Tax',
          status: 'Dismissed',
          consensusText: 'Consider harvesting losses in your taxable brokerage account.',
          confidenceScore: 76,
          sourceAlertId: 99,
          linkedTaskId: null,
          createdAt: now,
          updatedAt: now,
          dismissedAt: now,
        }),
      ),
    );

    const user = userEvent.setup();
    renderDashboard();

    try {
      // Wait for advice panel to render with the Tax theme chip
      await waitFor(() => {
        const advicePanel = screen.getByTestId('advice-panel');
        expect(within(advicePanel).getByText('Tax')).toBeInTheDocument();
      }, { timeout: 10_000 });

      // Find and click dismiss button
      const dismissButton = await screen.findByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // Should show toast
      await screen.findByText(/advice dismissed/i, {}, { timeout: 10_000 });

      const emittedEvents = debugSpy.mock.calls.map(call => call[1]);
      expect(emittedEvents).toContain('advice_dismiss_attempt');
      expect(emittedEvents).toContain('advice_dismiss_success');
    } finally {
      debugSpy.mockRestore();
    }
  }, 15_000);
});
