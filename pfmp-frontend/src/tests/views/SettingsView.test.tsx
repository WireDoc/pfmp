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
const mockUpdate = vi.fn();
const mockGetAccounts = vi.fn();
const mockGetGoals = vi.fn();
const mockGetIncome = vi.fn();
vi.mock('../../services/api', () => ({
  userService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  accountService: {
    getByUser: (...args: unknown[]) => mockGetAccounts(...args),
  },
  goalService: {
    getByUser: (...args: unknown[]) => mockGetGoals(...args),
  },
  incomeSourceService: {
    getByUser: (...args: unknown[]) => mockGetIncome(...args),
  },
}));

import { SettingsView } from '../../views/dashboard/SettingsView';

const mockUser = {
  data: {
    userId: 20,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    enableEmailAlerts: true,
    enablePushNotifications: true,
    enableRebalancingAlerts: true,
    rebalancingThreshold: 5,
    enableTaxOptimization: false,
    lastLoginAt: '2026-04-08T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-08T10:00:00Z',
  },
};

function renderSettingsView() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/settings']}>
      <SettingsView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetById.mockResolvedValue(mockUser);
  mockUpdate.mockResolvedValue({});
});

describe('SettingsView', () => {
  it('renders the settings heading', async () => {
    renderSettingsView();
    expect(await screen.findByText('Settings')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    mockGetById.mockReturnValue(new Promise(() => {}));
    renderSettingsView();
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders Connected Accounts link after loading', async () => {
    renderSettingsView();
    expect(await screen.findByText('Account Information')).toBeInTheDocument();
    // "Connected Accounts" appears in header and link — just verify it's present
    expect(screen.getAllByText('Connected Accounts').length).toBeGreaterThanOrEqual(1);
  });

  it('renders notification preference labels', async () => {
    renderSettingsView();
    expect(await screen.findByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Email Alerts')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Rebalancing Alerts')).toBeInTheDocument();
    expect(screen.getByText('Tax Optimization')).toBeInTheDocument();
  });

  it('renders switch toggles for each preference', async () => {
    renderSettingsView();
    await screen.findByText('Account Information');
    // MUI Switch renders as checkbox inputs with aria-label via slotProps
    const switches = document.querySelectorAll('input[type="checkbox"]');
    expect(switches.length).toBeGreaterThanOrEqual(4);
  });

  it('displays correct initial toggle states from user data', async () => {
    renderSettingsView();
    await screen.findByText('Account Information');
    const emailSwitch = screen.getByRole('checkbox', { name: 'Email Alerts' });
    const taxSwitch = screen.getByRole('checkbox', { name: 'Tax Optimization' });
    expect(emailSwitch).toBeChecked();
    expect(taxSwitch).not.toBeChecked();
  });

  it('saves preference when toggle is clicked', async () => {
    const user = userEvent.setup();
    renderSettingsView();
    await screen.findByText('Account Information');
    const taxSwitch = screen.getByRole('checkbox', { name: 'Tax Optimization' });

    await user.click(taxSwitch);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(20, expect.objectContaining({
        enableTaxOptimization: true,
      }));
    });
  });

  it('shows success toast after saving', async () => {
    const user = userEvent.setup();
    renderSettingsView();
    await screen.findByText('Account Information');
    const taxSwitch = screen.getByRole('checkbox', { name: 'Tax Optimization' });

    await user.click(taxSwitch);

    await waitFor(() => {
      expect(screen.getByText('Preference saved')).toBeInTheDocument();
    });
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    mockUpdate.mockRejectedValue(new Error('Save failed'));
    renderSettingsView();
    await screen.findByText('Account Information');
    const taxSwitch = screen.getByRole('checkbox', { name: 'Tax Optimization' });

    await user.click(taxSwitch);

    await waitFor(() => {
      expect(screen.getByText('Failed to save preference')).toBeInTheDocument();
    });
  });

  it('shows rebalancing threshold slider when rebalancing is enabled', async () => {
    renderSettingsView();
    await screen.findByText('Account Information');
    expect(screen.getByText(/Rebalancing Threshold: 5%/)).toBeInTheDocument();
  });

  it('displays account information section', async () => {
    renderSettingsView();
    expect(await screen.findByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows error toast when loading fails', async () => {
    mockGetById.mockRejectedValue(new Error('Network error'));
    renderSettingsView();

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });
  });

  it('renders Data Management section with export button', async () => {
    renderSettingsView();
    expect(await screen.findByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('exports data when Export CSV button is clicked', async () => {
    const user = userEvent.setup();
    mockGetAccounts.mockResolvedValue({ data: [{ accountName: 'Savings', institution: 'Bank', accountType: 'Checking', currentBalance: 5000, category: 'Cash' }] });
    mockGetGoals.mockResolvedValue({ data: [{ name: 'Retirement', type: 'Retirement', targetAmount: 100000, currentAmount: 25000, status: 'Active' }] });
    mockGetIncome.mockResolvedValue({ data: [{ description: 'Salary', sourceType: 'Employment', amount: 5000, frequency: 'Monthly' }] });

    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    renderSettingsView();
    await screen.findByText('Data Management');

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText('Data exported successfully')).toBeInTheDocument();
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
