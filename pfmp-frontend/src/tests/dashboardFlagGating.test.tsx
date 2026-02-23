import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { render, screen, act } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { updateFlags, getFeatureFlags } from '../flags/featureFlags';
import { AuthProvider } from '../contexts/AuthContext';
import Dashboard from '../views/Dashboard';
import DashboardPage from '../views/DashboardPage';

function DashboardRoute() {
  const flags = getFeatureFlags();
  return flags.enableDashboardWave4 ? <Dashboard /> : <Navigate to="/" replace />;
}

function Harness({ initialPath }: { initialPath: string }) {
  return (
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
          </Routes>
        </MemoryRouter>
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Dashboard Wave4 flag gating (MemoryRouter harness)', () => {
  beforeEach(() => {
    act(() => {
      updateFlags({ enableDashboardWave4: false, onboarding_persistence_enabled: false });
    });
  });

  it('does not render Wave4 dashboard when flag off (falls back to legacy dashboard)', async () => {
    render(<Harness initialPath="/dashboard" />);
    expect(await screen.findByText(/^Dashboard$/)).toBeInTheDocument();
    expect(screen.queryByTestId('wave4-dashboard-root')).toBeNull();
  });

  it('renders Wave4 dashboard when flag on', async () => {
    act(() => {
      updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false });
    });
    render(<Harness initialPath="/dashboard" />);
    const el = await screen.findByTestId('wave4-dashboard-root');
    expect(el).toBeInTheDocument();
  });
});
