import { Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useFeatureFlag } from './flags/featureFlags';
import { staticChildRoutes, StaticNotFoundComponent } from './routes/staticRoutes';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RootGuard } from './components/routing/RootGuard';
import { OnboardingGuard } from './components/routing/OnboardingGuard';
import { DashboardGuard } from './components/routing/DashboardGuard';
import { AppLayout } from './layout/AppLayout';
import { PageSpinner } from './components/common/PageSpinner';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

// NotFound lazy component supplied via staticRoutes (staticNotFound)

export interface AppRouterProps { initialEntries?: string[] }

export function AppRouter(props: AppRouterProps) {
  const enableWave4 = useFeatureFlag('enableDashboardWave4');
  const futureConfig = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

  const baseChildren = staticChildRoutes
    .filter(r => enableWave4 || r.id !== 'dashboard-wave4')
    .map(r => {
      const isWave4 = r.id === 'dashboard-wave4';
      const isRoot = r.id === 'root-index' || r.id === 'root-alias';
      const isOnboarding = r.id === 'onboarding';
      const RouteComponent = r.Component;
      let element = <RouteComponent />;
      
      // Use guard components to handle redirects inside the route ONLY when Wave4 is enabled
      if (isRoot && enableWave4) {
        element = <RootGuard />;
      }
      
      if (isOnboarding && enableWave4) {
        element = <OnboardingGuard><RouteComponent /></OnboardingGuard>;
      }
      
      if (isWave4 && enableWave4) {
        element = <DashboardGuard><RouteComponent /></DashboardGuard>;
      }
      
      // Wrap protected routes (legacy dashboard index & onboarding & wave4 when enabled)
      const protectedIds = new Set(['root-index', 'root-alias', 'onboarding', 'dashboard-wave4']);
      if (protectedIds.has(r.id)) {
        element = <ProtectedRoute>{element}</ProtectedRoute>;
      }
      
      const finalElement: React.ReactElement = <Suspense fallback={<PageSpinner />}>{element}</Suspense>;
      return r.index ? { index: true, element: finalElement } : { path: r.path!, element: finalElement };
    });

  // If flag disabled, we removed the /dashboard route. Provide an explicit redirect so tests hitting /dashboard don't 404.
  if (!enableWave4) {
    const DashboardLegacyLazy = staticChildRoutes.find(r => r.id === 'root-index')?.Component;
    if (DashboardLegacyLazy) {
      baseChildren.push({ 
        path: 'dashboard', 
        element: <Suspense fallback={<PageSpinner />}><ProtectedRoute><DashboardLegacyLazy /></ProtectedRoute></Suspense>
      });
    }
  }

  const routes = [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorBoundary><div style={{padding:24}}>Root error</div></RouteErrorBoundary>,
      children: baseChildren
    },
    { path: '*', element: <Suspense fallback={<PageSpinner />}><StaticNotFoundComponent /></Suspense> }
  ];

  const router = props.initialEntries
    ? createMemoryRouter(routes, { initialEntries: props.initialEntries })
    : createBrowserRouter(routes);

  return <RouterProvider router={router} future={futureConfig} />;
}
