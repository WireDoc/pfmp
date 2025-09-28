import React from 'react';

// Temporary placeholder until full auth + routing implemented.
// TODO: Replace with real auth guard that checks context and redirects.
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback = null }) => {
  // Placeholder logic: always allow. Later: use auth context (e.g., useAuth())
  const isAuthenticated = true; // replace with real check

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
