import { Suspense, lazy } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useFeatureFlag } from './flags/featureFlags';
import { staticChildRoutes, StaticNotFoundComponent } from './routes/staticRoutes';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RootGuard } from './components/routing/RootGuard';
import { OnboardingGuard } from './components/routing/OnboardingGuard';
import { DashboardGuard } from './components/routing/DashboardGuard';
import { AppLayout } from './layout/AppLayout';
import { DashboardLayout } from './layout/DashboardLayout';
import { PageSpinner } from './components/common/PageSpinner';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

// Lazy load dashboard components
const Dashboard = lazy(() => import('./views/Dashboard'));

// Lazy load dashboard sub-views
const AccountsView = lazy(() => import('./views/dashboard/AccountsView').then(m => ({ default: m.AccountsView })));
const AccountDetailView = lazy(() => import('./views/dashboard/AccountDetailView').then(m => ({ default: m.AccountDetailView })));
const CashAccountDetailView = lazy(() => import('./views/dashboard/CashAccountDetailView'));
const LoanAccountDetailView = lazy(() => import('./views/dashboard/LoanAccountDetailView'));
const CreditCardDetailView = lazy(() => import('./views/dashboard/CreditCardDetailView'));
const DebtPayoffDashboard = lazy(() => import('./views/dashboard/DebtPayoffDashboard'));
const InsightsView = lazy(() => import('./views/dashboard/InsightsView').then(m => ({ default: m.InsightsView })));
const TasksView = lazy(() => import('./views/dashboard/TasksView').then(m => ({ default: m.TasksView })));
const ProfileView = lazy(() => import('./views/dashboard/ProfileView').then(m => ({ default: m.ProfileView })));
const SettingsView = lazy(() => import('./views/dashboard/SettingsView').then(m => ({ default: m.SettingsView })));
const HelpView = lazy(() => import('./views/dashboard/HelpView').then(m => ({ default: m.HelpView })));

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

  // Add nested dashboard routes with DashboardLayout when Wave4 is enabled
  if (enableWave4) {
    // Replace the simple dashboard-wave4 route with a nested route structure
    const dashboardIndex = baseChildren.findIndex(child => !('index' in child) && child.path === 'dashboard');
    if (dashboardIndex !== -1) {
      // Remove the existing dashboard route (we'll replace it with nested structure)
      baseChildren.splice(dashboardIndex, 1);
      
      // Add nested dashboard routes with DashboardLayout
      // Wrap DashboardLayout with DashboardGuard to protect all nested routes
      baseChildren.push({
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardGuard>
              <Suspense fallback={<PageSpinner />}>
                <DashboardLayout />
              </Suspense>
            </DashboardGuard>
          </ProtectedRoute>
        ),
      } as { path: string; element: React.ReactElement; children?: Array<{ path?: string; index?: boolean; element: React.ReactElement}> } & {
        children: Array<{ path?: string; index?: boolean; element: React.ReactElement}>
      });
      
      // Now add the children to the dashboard route
      const dashboardRouteIndex = baseChildren.length - 1;
      const dashboardRouteWithChildren = baseChildren[dashboardRouteIndex] as typeof baseChildren[number] & {
        children?: Array<{ path?: string; index?: boolean; element: React.ReactElement}>;
      };
      dashboardRouteWithChildren.children = [
        {
          index: true,
          // Dashboard as the index route (guard is already at layout level)
          element: <Suspense fallback={<PageSpinner />}><Dashboard /></Suspense>,
        },
        {
          path: 'accounts',
          element: <Suspense fallback={<PageSpinner />}><AccountsView /></Suspense>,
        },
        {
          path: 'accounts/:accountId',
          element: <Suspense fallback={<PageSpinner />}><AccountDetailView /></Suspense>,
        },
        {
          path: 'cash-accounts/:cashAccountId',
          element: <Suspense fallback={<PageSpinner />}><CashAccountDetailView /></Suspense>,
        },
        {
          path: 'loans/:liabilityId',
          element: <Suspense fallback={<PageSpinner />}><LoanAccountDetailView /></Suspense>,
        },
        {
          path: 'credit-cards/:liabilityId',
          element: <Suspense fallback={<PageSpinner />}><CreditCardDetailView /></Suspense>,
        },
        {
          path: 'debt-payoff',
          element: <Suspense fallback={<PageSpinner />}><DebtPayoffDashboard /></Suspense>,
        },
        {
          path: 'insights',
          element: <Suspense fallback={<PageSpinner />}><InsightsView /></Suspense>,
        },
        {
          path: 'tasks',
          element: <Suspense fallback={<PageSpinner />}><TasksView /></Suspense>,
        },
        {
          path: 'profile',
          element: <Suspense fallback={<PageSpinner />}><ProfileView /></Suspense>,
        },
        {
          path: 'settings',
          element: <Suspense fallback={<PageSpinner />}><SettingsView /></Suspense>,
        },
        {
          path: 'help',
          element: <Suspense fallback={<PageSpinner />}><HelpView /></Suspense>,
        },
      ];
    }
  }

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
