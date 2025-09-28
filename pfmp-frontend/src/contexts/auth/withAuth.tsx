import React from 'react';
import { useAuth } from './AuthProvider';

/**
 * Higher-order component to protect routes/components that require authentication.
 * Separated into its own file so that AuthProvider.tsx only exports React components,
 * satisfying react-refresh/only-export-components fast refresh rule.
 */
export const withAuth = <P extends object>(Component: React.ComponentType<P>): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>
          Loading authentication...
        </div>
      );
    }
    if (!isAuthenticated) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
          <h2>Authentication Required</h2>
          <p>Please sign in to access the PFMP Dashboard</p>
        </div>
      );
    }
    return <Component {...props} />;
  };
};
