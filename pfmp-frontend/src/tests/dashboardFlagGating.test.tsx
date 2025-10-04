import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppRouter } from '../AppRouter';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import { AuthProvider } from '../contexts/AuthContext';

function renderWithProviders(initialPath: string) {
  return render(
    <AuthProvider>
      <OnboardingProvider>
        <AppRouter initialEntries={[initialPath]} />
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Dashboard Wave4 flag gating', () => {
  beforeEach(() => {
    updateFlags({ enableDashboardWave4: false });
  });

  it('does not render Wave4 dashboard when flag off (falls back to legacy dashboard)', () => {
    renderWithProviders('/dashboard');
    // Legacy placeholder h1 text
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Wave 4 Placeholder/)).toBeNull();
  });

  it('renders Wave4 dashboard when flag on', () => {
    updateFlags({ enableDashboardWave4: true });
    renderWithProviders('/dashboard');
    expect(screen.getByText(/Dashboard \(Wave 4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Wave 4 Placeholder/)).toBeInTheDocument();
  });
});
