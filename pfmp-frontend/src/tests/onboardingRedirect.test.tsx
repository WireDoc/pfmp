import { legacyDashboardTestId, wave4DashboardTestId } from './helpers/mockStaticRoutes';
import { useEffect, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { useOnboarding } from '../onboarding/useOnboarding';
import { updateFlags } from '../flags/featureFlags';
import { AuthProvider } from '../contexts/AuthContext';

import { AppRouter } from '../AppRouter';

// Helper component to leave onboarding intentionally incomplete (do not mark all as complete)
function IncompleteOnboardingHarness({ children }: { children: ReactNode }) {
  const ob = useOnboarding();
  useEffect(() => {
    // Ensure only first step is marked complete to simulate partial progress
    if (ob.completed.size === 0) {
      ob.markComplete();
    }
  }, [ob]);
  return <>{children}</>;
}

afterEach(() => {
  act(() => {
    updateFlags({ onboarding_persistence_enabled: true, enableDashboardWave4: false });
  });
});

function renderScenario(path: string, flag: boolean) {
  act(() => {
    updateFlags({ enableDashboardWave4: flag, onboarding_persistence_enabled: false });
  });
  return render(
    <AuthProvider>
      <OnboardingProvider skipAutoHydrate>
        <IncompleteOnboardingHarness>
          <AppRouter initialEntries={[path]} />
        </IncompleteOnboardingHarness>
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Onboarding gating redirects', () => {
  it('when wave4 dashboard enabled and onboarding incomplete, redirects to onboarding', async () => {
    renderScenario('/dashboard', true);
    // Expect onboarding page content (incomplete users are redirected)
    expect(await screen.findByRole('heading', { name: /Onboarding/i })).toBeInTheDocument();
  });

  it('when wave4 dashboard disabled, legacy dashboard accessible (no redirect)', async () => {
    renderScenario('/dashboard', false);
    expect(await screen.findByTestId(legacyDashboardTestId)).toBeInTheDocument();
  });
});
