import { useAuth } from '../../contexts/auth/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isDev } = useAuth();
  if (isAuthenticated || isDev) return children;
  return <Navigate to="/login" replace />;
}
