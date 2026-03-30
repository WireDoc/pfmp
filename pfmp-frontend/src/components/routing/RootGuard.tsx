import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { useAuth } from '../../contexts/auth/useAuth';
import { useDevUserReady } from '../../dev/devUserState';
import { PageSpinner } from '../common/PageSpinner';

/**
 * Guard component for root route (/ or index).
 * Redirects to /dashboard if complete, /onboarding if incomplete.
 */
export function RootGuard() {
  const { isDev } = useAuth();
  const devUserReady = useDevUserReady();
  const { hydrated, statuses } = useOnboarding();

  if (isDev && !devUserReady) {
    return <PageSpinner />;
  }

  if (!hydrated) {
    return <PageSpinner />;
  }

  const complete = statuses.review === 'completed';

  return <Navigate to={complete ? '/dashboard' : '/onboarding'} replace />;
}
