import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AppRouter } from '../AppRouter';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import { AuthProvider } from '../contexts/AuthContext';

// Helper wrapper to mark onboarding complete so dashboard is not redirected
function CompleteOnboarding({ children }: { children: React.ReactNode }) {
  const ob = useOnboarding();
  if (ob.completed.size < ob.steps.length) {
    ob.steps.forEach(s => ob.markComplete(s.id));
  }
  return <>{children}</>;
}

function renderWithProviders(initialPath: string, complete = false) {
  return render(
    <AuthProvider>
      <OnboardingProvider>
        {complete ? <CompleteOnboarding><AppRouter initialEntries={[initialPath]} /></CompleteOnboarding> : <AppRouter initialEntries={[initialPath]} />}
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Dashboard Wave4 flag gating', () => {
  beforeEach(() => {
    updateFlags({ enableDashboardWave4: false });
  });

  it('does not render Wave4 dashboard when flag off (falls back to legacy dashboard)', async () => {
    renderWithProviders('/dashboard', true);
    await waitFor(() => expect(screen.getByText(/^Dashboard$/)).toBeInTheDocument());
    expect(screen.queryByText(/Wave 4 Placeholder/)).toBeNull();
  });

  it('renders Wave4 dashboard when flag on', async () => {
    updateFlags({ enableDashboardWave4: true });
    renderWithProviders('/dashboard', true);
    await waitFor(() => expect(screen.getByText(/Dashboard \(Wave 4\)/)).toBeInTheDocument());
    expect(screen.getByText(/Wave 4 Placeholder/)).toBeInTheDocument();
  });
});
