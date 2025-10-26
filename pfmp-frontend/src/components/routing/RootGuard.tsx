import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { PageSpinner } from '../common/PageSpinner';

/**
 * Guard component for root route (/ or index).
 * Redirects to /dashboard if complete, /onboarding if incomplete.
 */
export function RootGuard() {
  const { hydrated, statuses } = useOnboarding();

  if (!hydrated) {
    return <PageSpinner />;
  }

  const complete = statuses.review === 'completed';

  return <Navigate to={complete ? '/dashboard' : '/onboarding'} replace />;
}
