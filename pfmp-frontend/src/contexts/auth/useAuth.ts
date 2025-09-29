import { useContext } from 'react';
import { AuthContext } from './AuthContextObject';
import type { AuthContextType } from './types';

/**
 * Consumer hook for authentication context.
 * Split out so that AuthProvider file only exports a component, complying with react-refresh rule.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
