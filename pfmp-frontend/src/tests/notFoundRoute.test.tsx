import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import NotFoundPage from '../views/NotFoundPage';

// Direct test of NotFound route element to avoid needing full AppRouter complexity.

describe('NotFound route', () => {
  it('renders not found content for unknown path', () => {
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>        
        <AuthProvider __forceDevOff>
          <Routes>
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  expect(screen.getByText(/404 - Not Found/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /return to dashboard/i })).toBeInTheDocument();
  });
});
