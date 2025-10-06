import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { AppRouter } from '../AppRouter';
import { updateFlags } from '../flags/featureFlags';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { AuthProvider } from '../contexts/AuthContext';

function Wrapper({ initialPath }: { initialPath: string }) {
  return (
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <AppRouter initialEntries={[initialPath]} />
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('AppRouter Wave4 dashboard gating (static routes)', () => {
  beforeEach(() => {
    act(() => {
      updateFlags({ enableDashboardWave4: false, onboarding_persistence_enabled: false });
    });
  });

  it('falls back to legacy dashboard when flag off', async () => {
    render(<Wrapper initialPath="/dashboard" />);
    expect(await screen.findByText(/^Dashboard$/)).toBeInTheDocument();
    expect(screen.queryByTestId('wave4-dashboard-root')).toBeNull();
  });

  it('renders Wave4 dashboard when flag on', async () => {
    act(() => {
      updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false });
    });
    render(<Wrapper initialPath="/dashboard" />);
    const el = await screen.findByTestId('wave4-dashboard-root');
    expect(el).toBeInTheDocument();
  });
});
