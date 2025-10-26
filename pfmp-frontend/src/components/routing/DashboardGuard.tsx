import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { PageSpinner } from '../common/PageSpinner';

/**
 * Guard component for /dashboard route.
 * Redirects incomplete users to /onboarding.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { hydrated, statuses } = useOnboarding();

  if (!hydrated) {
    return <PageSpinner />;
  }

  const complete = statuses.review === 'completed';

  if (!complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
