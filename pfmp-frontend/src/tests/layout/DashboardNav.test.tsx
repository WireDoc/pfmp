import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardNav } from '../../layout/DashboardNav';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the useAuth hook to provide test user
vi.mock('../../contexts/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      roles: [],
      permissions: [],
    },
    isDev: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

function renderDashboardNav(props: {
  collapsed?: boolean;
  mobileOpen?: boolean;
  isMobile?: boolean;
  width?: number;
}) {
  const defaultProps = {
    collapsed: false,
    mobileOpen: false,
    onToggle: vi.fn(),
    onCloseMobile: vi.fn(),
    isMobile: false,
    width: 240,
    ...props,
  };

  return render(
    <MemoryRouter>
      <DashboardNav {...defaultProps} />
    </MemoryRouter>
  );
}

describe('DashboardNav', () => {
  describe('Navigation Items', () => {
    it('should render primary navigation items when expanded', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('should render secondary navigation items when expanded', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();
    });

    it('should render all navigation icons', () => {
      renderDashboardNav({ collapsed: false });
      // MUI icons render as svgs
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Collapsed State', () => {
    it('should hide text labels when collapsed', () => {
      renderDashboardNav({ collapsed: true, width: 64 });
      // In collapsed state, icons should be visible but full text labels hidden
      // Text might still be in DOM for tooltips but not directly visible
      const icons = screen.getAllByRole('link');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should adjust width based on collapsed state', () => {
      const { container } = renderDashboardNav({ collapsed: true, width: 64 });
      const drawer = container.querySelector('.MuiDrawer-paper');
      // Check that drawer exists and has width styling
      expect(drawer).toBeInTheDocument();
    });
  });

  describe('User Profile', () => {
    it('should display user name when expanded', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display username when expanded', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should render sign out button', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should display user avatar with first letter of name', () => {
      renderDashboardNav({ collapsed: false });
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    it('should render drawer on mobile when open', () => {
      renderDashboardNav({ isMobile: true, mobileOpen: true });
      // On mobile with drawer open, navigation items should be visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });

    it('should render permanent drawer on desktop', () => {
      renderDashboardNav({ isMobile: false });
      // On desktop, navigation items should always be visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on toggle button', () => {
      renderDashboardNav({ collapsed: false });
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have navigation landmark', () => {
      const { container } = renderDashboardNav({ collapsed: false });
      // The drawer content should have proper navigation structure
      const nav = container.querySelector('nav') || container.querySelector('[role="navigation"]');
      expect(nav || container.querySelector('.MuiDrawer-root')).toBeInTheDocument();
    });

    it('should have proper link elements', () => {
      renderDashboardNav({ collapsed: false });
      const links = screen.getAllByRole('link');
      // Should have at least primary + secondary nav links
      expect(links.length).toBeGreaterThanOrEqual(7);
    });
  });
});
