import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ROUTES } from './routes/routeDefs';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { PageSpinner } from './components/common/PageSpinner';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

const NotFoundLazy = lazy(() => import('./views/NotFoundPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary><div style={{padding:24}}>Root error</div></RouteErrorBoundary>,
    children: ROUTES.filter(r => r.path !== '*').map(r => {
      const Component = lazy(r.lazyImport!);
      const element = r.protected ? (
        <ProtectedRoute>
          <Component />
        </ProtectedRoute>
      ) : <Component />;
      return {
        path: r.path.replace(/^\//,''),
        element: <Suspense fallback={<PageSpinner />}>{element}</Suspense>,
      };
    })
  },
  { path: '*', element: <Suspense fallback={<PageSpinner />}><NotFoundLazy /></Suspense> }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
