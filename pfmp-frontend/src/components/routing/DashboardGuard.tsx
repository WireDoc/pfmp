import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { useAuth } from '../../contexts/auth/useAuth';
import { useDevUserReady } from '../../dev/devUserState';
import { PageSpinner } from '../common/PageSpinner';

/**
 * Guard component for /dashboard route.
 * In dev mode, waits for the dev user ID to be available (from localStorage or DevUserSwitcher)
 * before evaluating onboarding state. This prevents wrong-user hydration when navigating directly
 * to a dashboard URL.
 * Redirects incomplete users to /onboarding.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isDev } = useAuth();
  const devUserReady = useDevUserReady();
  const { hydrated, statuses } = useOnboarding();

  // In dev mode, wait for the dev user store to be initialized before evaluating guards.
  // Without this, the OnboardingProvider hydrates against userId=1 (the fallback) and
  // may redirect away before DevUserSwitcher has a chance to set the correct user.
  if (isDev && !devUserReady) {
    return <PageSpinner />;
  }

  if (!hydrated) {
    return <PageSpinner />;
  }

  const complete = statuses.review === 'completed';

  if (!complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
