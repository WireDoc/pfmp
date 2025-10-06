import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { AuthProvider } from '../contexts/AuthContext';

// Simple smoke test ensuring layout renders and nav links present

describe('Routing skeleton', () => {
  it('renders navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('PFMP')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });
});
