// Refactored: functionality split into modular files under ./auth
// This file now re-exports the public authentication surface to avoid breaking
// any existing import paths (even though none were present yet). Use one of:
// import { AuthProvider, useAuth, withAuth, msalInstance } from '../contexts/AuthContext';
// or preferably: import { AuthProvider, useAuth } from '../contexts/auth';

export * from './auth'; // Auth surface (no msal-react provider to keep React 19 compatibility)
