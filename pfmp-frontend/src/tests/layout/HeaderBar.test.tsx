import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeaderBar } from '../../layout/HeaderBar';

// Mock the useAuth hook
vi.mock('../../contexts/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      roles: [],
      permissions: [],
    },
    isAuthenticated: true,
    isDev: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  })),
}));

// Mock the LogoMark component
vi.mock('../../components/branding/LogoMark', () => ({
  LogoMark: () => <div data-testid="logo-mark">Logo</div>,
}));

function renderHeaderBar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <HeaderBar />
    </MemoryRouter>
  );
}

describe('HeaderBar', () => {
  describe('Branding', () => {
    it('should render the PFMP logo', () => {
      renderHeaderBar();
      expect(screen.getByTestId('logo-mark')).toBeInTheDocument();
    });

    it('should render the PFMP title', () => {
      renderHeaderBar();
      expect(screen.getByText('PFMP')).toBeInTheDocument();
    });

    it('should render the platform subtitle', () => {
      renderHeaderBar();
      expect(screen.getByText('Personal Financial Management Platform')).toBeInTheDocument();
    });

    it('should render the version number', () => {
      renderHeaderBar();
      expect(screen.getByText(/v0\.7\.0-alpha/)).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should render Dashboard link', () => {
      renderHeaderBar();
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should render Onboarding link', () => {
      renderHeaderBar();
      const onboardingLink = screen.getByRole('link', { name: 'Onboarding' });
      expect(onboardingLink).toBeInTheDocument();
      expect(onboardingLink).toHaveAttribute('href', '/onboarding');
    });

    it('should render Login link', () => {
      renderHeaderBar();
      const loginLink = screen.getByRole('link', { name: 'Login' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render Connections link', () => {
      renderHeaderBar();
      const connectionsLink = screen.getByRole('link', { name: 'Connections' });
      expect(connectionsLink).toBeInTheDocument();
      expect(connectionsLink).toHaveAttribute('href', '/dashboard/settings/connections');
    });

    it('should render Scheduler link', () => {
      renderHeaderBar();
      const schedulerLink = screen.getByRole('link', { name: 'Scheduler' });
      expect(schedulerLink).toBeInTheDocument();
      expect(schedulerLink).toHaveAttribute('href', '/dashboard/admin/scheduler');
    });

    it('should have 5 navigation links total', () => {
      renderHeaderBar();
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(5);
    });
  });

  describe('User Display', () => {
    it('should display authenticated user name', () => {
      renderHeaderBar();
      expect(screen.getByText(/User: Test User/)).toBeInTheDocument();
    });
  });

  describe('Dev Mode', () => {
    it('should show DEV badge when isDev is true', async () => {
      const { useAuth } = await import('../../contexts/auth/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'dev', name: 'Dev User', email: 'dev@test.com', roles: [], permissions: [] },
        isAuthenticated: true,
        isDev: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderHeaderBar();
      expect(screen.getByText('DEV')).toBeInTheDocument();
    });
  });

  describe('Guest Mode', () => {
    it('should display Guest when not authenticated', async () => {
      const { useAuth } = await import('../../contexts/auth/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isDev: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderHeaderBar();
      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
  });
});
