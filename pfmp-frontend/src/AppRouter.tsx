import { Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useFeatureFlag } from './flags/featureFlags';
import { staticChildRoutes, staticNotFound } from './routes/staticRoutes';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { PageSpinner } from './components/common/PageSpinner';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { useOnboarding } from './onboarding/OnboardingContext';

// NotFound lazy component supplied via staticRoutes (staticNotFound)

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
  const enableWave4 = useFeatureFlag('enableDashboardWave4');
  const { hydrated, complete } = useOnboardingState();

  const baseChildren = staticChildRoutes
    .filter(r => enableWave4 || r.id !== 'dashboard-wave4')
    .map(r => {
      const isWave4 = r.id === 'dashboard-wave4';
      let element = r.element;
      if (isWave4) {
        if (!enableWave4) {
          element = <Navigate to="/" replace />;
        } else {
          if (!hydrated) {
            element = <PageSpinner />;
          } else if (!complete) {
            element = <Navigate to="/onboarding" replace />;
          }
        }
      }
      // Wrap protected routes (legacy dashboard index & onboarding & wave4 when enabled)
      const protectedIds = new Set(['root-index', 'root-alias', 'onboarding', 'dashboard-wave4']);
      if (protectedIds.has(r.id)) {
        element = <ProtectedRoute>{element}</ProtectedRoute>;
      }
      let finalElement: React.ReactElement;
      finalElement = <Suspense fallback={<PageSpinner />}>{element}</Suspense>;
      // Test logging removed after stabilization
      return r.index ? { index: true, element: finalElement } : { path: r.path!, element: finalElement };
    });

  // If flag disabled, we removed the /dashboard route. Provide an explicit redirect so tests hitting /dashboard don't 404.
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
  { path: '*', element: <Suspense fallback={<PageSpinner />}>{staticNotFound}</Suspense> }
  ];

  const router = props.initialEntries
    ? createMemoryRouter(routes, { initialEntries: props.initialEntries })
    : createBrowserRouter(routes);

  return <RouterProvider router={router} />;
}
