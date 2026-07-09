import { useAuth } from '../../contexts/auth/useAuth';
import { Navigate } from 'react-router-dom';
import React from 'react';
import { PageSpinner } from '../common/PageSpinner';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isDev, loading } = useAuth();
  // Wave 25 Phase E: hold rendering until auth init settles. Redirecting to
  // /login while MSAL is still processing a redirect response would strip the
  // auth code from the URL fragment and break the login round-trip.
  if (loading) return <PageSpinner />;
  if (isAuthenticated || isDev) return children;
  return <Navigate to="/login" replace />;
}
