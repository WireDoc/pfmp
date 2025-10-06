import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { updateFlags } from '../flags/featureFlags';
import DashboardWave4 from '../views/DashboardWave4';

function renderMinimal(path: string) {
  const routes = [
    { path: '/dashboard', element: <DashboardWave4 /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AuthProvider>
      <OnboardingProvider testCompleteAll>
        <RouterProvider router={router} />
      </OnboardingProvider>
    </AuthProvider>
  );
}

describe('Minimal router Wave4 route', () => {
  it('renders Wave4 dashboard directly via memory router', async () => {
    updateFlags({ enableDashboardWave4: true, onboarding_persistence_enabled: false });
    renderMinimal('/dashboard');
    const root = await screen.findByTestId('wave4-dashboard-root');
    expect(root).toBeInTheDocument();
  });
});
