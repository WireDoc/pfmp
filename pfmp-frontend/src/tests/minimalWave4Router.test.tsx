import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import Dashboard from '../views/Dashboard';

const futureConfig = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

function renderMinimal(path: string) {
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll skipAutoHydrate>
        <MemoryRouter initialEntries={[path]} future={futureConfig}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Minimal router Wave4 route', () => {
  it('renders Wave4 dashboard directly via memory router', async () => {
    act(() => {
      updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false });
    });
    renderMinimal('/dashboard');
    const root = await screen.findByTestId('wave4-dashboard-root');
    expect(root).toBeInTheDocument();
  });
});
