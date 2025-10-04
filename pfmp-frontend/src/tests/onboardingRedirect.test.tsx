import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../AppRouter';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import { AuthProvider } from '../contexts/AuthContext';
import React, { useEffect } from 'react';

// Helper component to leave onboarding intentionally incomplete (do not mark all as complete)
function IncompleteOnboardingHarness({ children }: { children: React.ReactNode }) {
  const ob = useOnboarding();
  useEffect(() => {
    // Ensure only first step is marked complete to simulate partial progress
    if (ob.completed.size === 0) {
      ob.markComplete();
    }
  }, [ob]);
  return <>{children}</>;
}

function renderScenario(path: string, flag: boolean) {
  updateFlags({ enableDashboardWave4: flag });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <OnboardingProvider>
          <IncompleteOnboardingHarness>
            <AppRouter />
          </IncompleteOnboardingHarness>
        </OnboardingProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Onboarding gating redirects', () => {
  it('when wave4 dashboard enabled and onboarding incomplete, redirects to onboarding', async () => {
    renderScenario('/dashboard', true);
    // Expect onboarding page content
    expect(await screen.findByText(/Onboarding/i)).toBeInTheDocument();
  });

  it('when wave4 dashboard disabled, legacy dashboard accessible (no redirect)', async () => {
    renderScenario('/dashboard', false);
    expect(await screen.findByText(/Dashboard/)).toBeInTheDocument();
  });
});
