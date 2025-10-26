import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { PageSpinner } from '../common/PageSpinner';

/**
 * Guard component for /onboarding route.
 * Redirects complete users to /dashboard.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { hydrated, statuses } = useOnboarding();

  if (!hydrated) {
    return <PageSpinner />;
  }

  const complete = statuses.review === 'completed';

  if (complete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
