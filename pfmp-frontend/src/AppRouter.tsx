import { lazy, Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider, Navigate } from 'react-router-dom';
import { isFeatureEnabled } from './flags/featureFlags';
import { ROUTES } from './routes/routeDefs';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { PageSpinner } from './components/common/PageSpinner';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { useOnboarding } from './onboarding/OnboardingContext';

const NotFoundLazy = lazy(() => import('./views/NotFoundPage'));

function useOnboardingState() {
  try {
    const ob = useOnboarding();
    return {
      hydrated: ob.hydrated,
      complete: ob.completed.size >= ob.steps.length,
    };
  } catch {
    return { hydrated: true, complete: true };
  }
}

export interface AppRouterProps { initialEntries?: string[] }

export function AppRouter(props: AppRouterProps) {
  const enableWave4 = isFeatureEnabled('enableDashboardWave4');
  const { hydrated, complete } = useOnboardingState();

  const filtered = ROUTES.filter(r => {
    if (!enableWave4 && r.id === 'dashboard-wave4') return false;
    return true;
  });

  const baseChildren = filtered.filter(r => r.path !== '*').map(r => {
    const Component = lazy(r.lazyImport!);
    const element = r.protected ? (
      <ProtectedRoute>
        {(!hydrated) ? <PageSpinner /> : (!complete && enableWave4 && r.id === 'dashboard-wave4') ? <Navigate to="/onboarding" replace /> : <Component />}
      </ProtectedRoute>
    ) : <Component />;
    return {
      path: r.path.replace(/^\//,''),
      element: <Suspense fallback={<PageSpinner />}>{element}</Suspense>,
    };
  });

  // If wave4 disabled, provide a graceful redirect for /dashboard back to legacy root
  if (!enableWave4) {
    baseChildren.push({ path: 'dashboard', element: <Navigate to="/" replace /> });
  }

  const routes = [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorBoundary><div style={{padding:24}}>Root error</div></RouteErrorBoundary>,
      children: baseChildren
    },
    { path: '*', element: <Suspense fallback={<PageSpinner />}><NotFoundLazy /></Suspense> }
  ];

  const router = props.initialEntries
    ? createMemoryRouter(routes, { initialEntries: props.initialEntries })
    : createBrowserRouter(routes);

  return <RouterProvider router={router} />;
}
