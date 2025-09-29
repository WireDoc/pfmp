import { createContext } from 'react';
import type { AuthContextType } from './types';

// Separate context object so that AuthProvider.tsx only exports a component.
export const AuthContext = createContext<AuthContextType | null>(null);
