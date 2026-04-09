import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

const mockGetById = vi.fn();
vi.mock('../../services/api', () => ({
  userService: {
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

import { HelpView } from '../../views/dashboard/HelpView';

const mockUser = {
  data: {
    userId: 20,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    profileSetupComplete: true,
    accounts: [{ accountId: 1 }],
  },
};

function renderHelpView() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/help']}>
      <HelpView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetById.mockResolvedValue(mockUser);
});

describe('HelpView', () => {
  it('renders the help heading', async () => {
    renderHelpView();
    expect(await screen.findByText('Help & Documentation')).toBeInTheDocument();
  });

  it('displays Getting Started section with step count', async () => {
    renderHelpView();
    expect(await screen.findByText('Getting Started')).toBeInTheDocument();
    // Should show progress chip (e.g. "4/6 complete")
    await waitFor(() => {
      expect(screen.getByText(/\d+\/6 complete/)).toBeInTheDocument();
    });
  });

  it('shows all getting started steps', async () => {
    renderHelpView();
    expect(await screen.findByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Complete your financial profile')).toBeInTheDocument();
    expect(screen.getByText('Link your accounts')).toBeInTheDocument();
    expect(screen.getByText('Review your dashboard')).toBeInTheDocument();
    expect(screen.getByText('Run an AI analysis')).toBeInTheDocument();
    expect(screen.getByText('Review and act on advice')).toBeInTheDocument();
  });

  it('displays FAQ section with accordion items', async () => {
    renderHelpView();
    expect(await screen.findByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('How does PFMP use my financial data?')).toBeInTheDocument();
    expect(screen.getByText('How do I connect my bank accounts?')).toBeInTheDocument();
  });

  it('expands FAQ accordion on click', async () => {
    const user = userEvent.setup();
    renderHelpView();
    const faqItem = await screen.findByText('How does PFMP use my financial data?');
    await user.click(faqItem);

    await waitFor(() => {
      expect(screen.getByText(/Data is never shared with third parties/)).toBeInTheDocument();
    });
  });

  it('displays keyboard shortcuts section', async () => {
    renderHelpView();
    expect(await screen.findByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + K')).toBeInTheDocument();
  });

  it('displays version info', async () => {
    renderHelpView();
    expect(await screen.findByText(/v0\.15\.0-alpha/)).toBeInTheDocument();
  });

  it('displays support contact link', async () => {
    renderHelpView();
    const link = await screen.findByText('support@pfmp.example.com');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'mailto:support@pfmp.example.com');
  });

  it('marks completed steps based on user data', async () => {
    renderHelpView();
    // Wait for user data to load
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(20);
    });
    // The "Create your account" step should be completed (user exists)
    // Verify by checking that checkmark icons are present
    await waitFor(() => {
      const checkIcons = document.querySelectorAll('[data-testid="CheckCircleIcon"]');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });
});
