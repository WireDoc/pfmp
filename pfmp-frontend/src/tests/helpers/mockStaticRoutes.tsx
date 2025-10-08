/* eslint-disable react-refresh/only-export-components */
import { vi } from 'vitest';

export const legacyDashboardTestId = 'legacy-dashboard-content';
export const wave4DashboardTestId = 'wave4-dashboard-root';

const LegacyDashboard = () => <div data-testid={legacyDashboardTestId}>Legacy Dashboard</div>;
const Onboarding = () => (
  <div>
    <h1>Onboarding</h1>
  </div>
);
const Wave4Dashboard = () => <div data-testid={wave4DashboardTestId}>Wave4 Dashboard</div>;
const Login = () => <div>Login</div>;
const NotFound = () => <div>Not Found</div>;

vi.mock('../../routes/staticRoutes', () => ({
  staticChildRoutes: [
    { id: 'root-index', index: true, Component: LegacyDashboard },
    { id: 'root-alias', path: '', Component: LegacyDashboard },
    { id: 'onboarding', path: 'onboarding', Component: Onboarding },
    { id: 'dashboard-wave4', path: 'dashboard', Component: Wave4Dashboard },
    { id: 'login', path: 'login', Component: Login },
  ],
  StaticNotFoundComponent: NotFound,
}));
