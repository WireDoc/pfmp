import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardBreadcrumbs } from '../../components/navigation/DashboardBreadcrumbs';

// Helper to render with router at a specific path
function renderBreadcrumbs(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<DashboardBreadcrumbs />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardBreadcrumbs', () => {
  it('should not render breadcrumbs on main dashboard', () => {
    const { container } = renderBreadcrumbs('/dashboard');
    expect(container.firstChild).toBeNull();
  });

  it('should render breadcrumbs for accounts page', () => {
    renderBreadcrumbs('/dashboard/accounts');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('should render breadcrumbs for insights page', () => {
    renderBreadcrumbs('/dashboard/insights');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('should render breadcrumbs for tasks page', () => {
    renderBreadcrumbs('/dashboard/tasks');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('should render breadcrumbs for profile page', () => {
    renderBreadcrumbs('/dashboard/profile');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should render breadcrumbs for settings page', () => {
    renderBreadcrumbs('/dashboard/settings');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render breadcrumbs with detail page', () => {
    renderBreadcrumbs('/dashboard/accounts/123');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    // Account name is fetched asynchronously, so it shows 'Loading...' initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should make non-current breadcrumbs clickable links', () => {
    renderBreadcrumbs('/dashboard/accounts');
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should render current page as non-clickable text', () => {
    renderBreadcrumbs('/dashboard/accounts');
    const accountsText = screen.getByText('Accounts');
    expect(accountsText.tagName).toBe('P'); // Typography renders as <p>
    expect(accountsText.closest('a')).toBeNull();
  });

  it('should include home icon for dashboard breadcrumb', () => {
    renderBreadcrumbs('/dashboard/accounts');
    // MUI HomeIcon renders as an svg
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.querySelector('svg')).toBeInTheDocument();
  });
});

