import { lazyWithPreload } from '../utils/lazyWithPreload';

// Lazy components (production behavior preserved)
export const DashboardLegacyLazy = lazyWithPreload(() => import('../views/DashboardPage'));
export const OnboardingLazy = lazyWithPreload(() => import('../views/OnboardingPage'));
export const DashboardWave4Lazy = lazyWithPreload(() => import('../views/DashboardWave4'));
export const LoginLazy = lazyWithPreload(() => import('../views/LoginPlaceholder'));
export const NotFoundLazy = lazyWithPreload(() => import('../views/NotFoundPage'));

export interface StaticRouteDef {
  id: string;
  path?: string; // omitted for index
  index?: boolean;
  element: React.ReactElement;
}

export const staticChildRoutes: StaticRouteDef[] = [
  // Provide both index and explicit alias path for root to help memory routing of fallback redirects/tests.
  { id: 'root-index', index: true, element: <DashboardLegacyLazy /> },
  { id: 'root-alias', path: '', element: <DashboardLegacyLazy /> },
  { id: 'onboarding', path: 'onboarding', element: <OnboardingLazy /> },
  { id: 'dashboard-wave4', path: 'dashboard', element: <DashboardWave4Lazy /> },
  { id: 'login', path: 'login', element: <LoginLazy /> },
];

export const staticNotFound = <NotFoundLazy />;