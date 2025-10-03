import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { render, screen } from '@testing-library/react';

// Helper to temporarily disable DEV auto-auth simulation.
// We'll mock import.meta.env to force DEV=false for one test.

describe('ProtectedRoute', () => {
  it('redirects unauthenticated user to /login (dev mode off)', () => {
    render(
      <MemoryRouter initialEntries={['/secure']}>
        <AuthProvider __forceDevOff>
          <Routes>
            <Route path="/login" element={<div>LoginPage</div>} />
            <Route
              path="/secure"
              element={
                <ProtectedRoute>
                  <div>SecureContent</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('LoginPage')).toBeInTheDocument();
  });

  it('renders children when authenticated (dev mode auto auth)', () => {
    render(
      <MemoryRouter initialEntries={['/secure']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/secure"
              element={
                <ProtectedRoute>
                  <div>SecureContent</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('SecureContent')).toBeInTheDocument();
  });
});
