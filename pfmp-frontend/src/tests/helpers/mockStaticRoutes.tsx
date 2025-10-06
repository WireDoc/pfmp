import React from 'react';
import { vi } from 'vitest';

export const legacyDashboardTestId = 'legacy-dashboard-content';
export const wave4DashboardTestId = 'wave4-dashboard-root';

vi.mock('../../routes/staticRoutes', () => ({
  staticChildRoutes: [
    { id: 'root-index', index: true, element: <div data-testid={legacyDashboardTestId}>Legacy Dashboard</div> },
    { id: 'root-alias', path: '', element: <div data-testid={legacyDashboardTestId}>Legacy Dashboard</div> },
    {
      id: 'onboarding',
      path: 'onboarding',
      element: (
        <div>
          <h1>Onboarding</h1>
        </div>
      ),
    },
    {
      id: 'dashboard-wave4',
      path: 'dashboard',
      element: <div data-testid={wave4DashboardTestId}>Wave4 Dashboard</div>,
    },
    { id: 'login', path: 'login', element: <div>Login</div> },
  ],
  staticNotFound: <div>Not Found</div>,
}));
