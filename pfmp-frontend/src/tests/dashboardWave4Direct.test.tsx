import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { AuthProvider } from '../contexts/AuthContext';
import DashboardWave4 from '../views/DashboardWave4';
import { updateFlags } from '../flags/featureFlags';

function renderDirect() {
  updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false });
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll>
        <DashboardWave4 />
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('DashboardWave4 direct component render', () => {
  it('renders root test id and basic sections', async () => {
    renderDirect();
    const root = await screen.findByTestId('wave4-dashboard-root');
    expect(root).toBeInTheDocument();
    expect(screen.getByText(/Dashboard \(Wave 4\)/)).toBeInTheDocument();
    // Loading skeleton first then data; allow a tick
  });
});
