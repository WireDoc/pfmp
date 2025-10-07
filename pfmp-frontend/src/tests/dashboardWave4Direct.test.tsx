import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { AuthProvider } from '../contexts/AuthContext';
import DashboardWave4 from '../views/DashboardWave4';
import { updateFlags } from '../flags/featureFlags';
import { mockDashboardSummary, http, HttpResponse } from './mocks/handlers';
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

function renderDashboardWithRealData(summary: Parameters<typeof mockDashboardSummary>[0]) {
  act(() => {
    updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false, dashboard_wave4_real_data: true });
  });
  __resetDashboardServiceForTest();
  mswServer.use(...mockDashboardSummary(summary));
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
});

describe('DashboardWave4 direct component render', () => {
  it('renders root test id and basic sections', async () => {
    renderDashboard();
    const root = await screen.findByTestId('wave4-dashboard-root');
    expect(root).toBeInTheDocument();
    expect(screen.getByText(/Dashboard \(Wave 4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, John Smith/)).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-summary-text').textContent).toContain('Onboarding complete');
    // Loading skeleton first then data; allow a tick
  });

  it('renders real data when API summary succeeds', async () => {
    renderDashboardWithRealData({
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
    });

    expect(await screen.findByText('$200,000')).toBeInTheDocument();
    expect(screen.getByText(/Fidelity Brokerage/)).toBeInTheDocument();
    expect(screen.getByText(/Rebalance recommended/)).toBeInTheDocument();
  });

  it('shows empty states when summary returns no accounts or insights', async () => {
    renderDashboardWithRealData({
      netWorth: {
        totalAssets: { amount: 1000, currency: 'USD' },
        totalLiabilities: { amount: 100, currency: 'USD' },
        netWorth: { amount: 900, currency: 'USD' },
        lastUpdated: '2025-10-07T01:00:00Z',
      },
      accounts: [],
      insights: [],
    });

    expect(await screen.findByText('$900')).toBeInTheDocument();
    expect(await screen.findByText('No accounts')).toBeInTheDocument();
    expect(screen.getByText('No insights')).toBeInTheDocument();
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
});
