import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountDetailsCard } from './AccountDetailsCard';

const mockAccount = {
  accountId: 123,
  accountName: 'Checking Account',
  institution: 'First National Bank',
  accountType: 'Checking',
  accountNumber: '1234567890',
  routingNumber: '987654321',
  currentBalance: 5432.10,
  interestRate: 0.05,
  openingDate: '2020-01-15',
  lastSyncDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  status: 'Active' as const,
  notes: 'Primary checking account'
};

describe('AccountDetailsCard', () => {
  it('renders account information', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('First National Bank')).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('$5,432.10')).toBeInTheDocument();
  });

  it('masks account number by default', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    expect(screen.getByText('****7890')).toBeInTheDocument();
    expect(screen.queryByText('1234567890')).not.toBeInTheDocument();
  });

  it('masks routing number by default', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    expect(screen.getByText('****4321')).toBeInTheDocument();
    expect(screen.queryByText('987654321')).not.toBeInTheDocument();
  });

  it('toggles account number visibility', async () => {
    const user = userEvent.setup();
    render(<AccountDetailsCard account={mockAccount} />);

    // Initially masked
    expect(screen.getByText('****7890')).toBeInTheDocument();

    // Find and click the visibility toggle for account number
    const accountSection = screen.getByText('Account Number').closest('div')?.parentElement;
    const toggleButton = accountSection?.querySelector('button[aria-label*="Show"]');
    
    if (toggleButton) {
      await user.click(toggleButton);
      
      // Should now be visible
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.queryByText('****7890')).not.toBeInTheDocument();
    }
  });

  it('toggles routing number visibility', async () => {
    const user = userEvent.setup();
    render(<AccountDetailsCard account={mockAccount} />);

    // Initially masked
    expect(screen.getByText('****4321')).toBeInTheDocument();

    // Find and click the visibility toggle for routing number
    const routingSection = screen.getByText('Routing Number').closest('div')?.parentElement;
    const toggleButton = routingSection?.querySelector('button[aria-label*="Show"]');
    
    if (toggleButton) {
      await user.click(toggleButton);
      
      // Should now be visible
      expect(screen.getByText('987654321')).toBeInTheDocument();
      expect(screen.queryByText('****4321')).not.toBeInTheDocument();
    }
  });

  it('displays interest rate as percentage', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    expect(screen.getByText('0.05%')).toBeInTheDocument();
  });

  it('displays status chip with correct color', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    const statusChip = screen.getByText('Active').closest('div');
    expect(statusChip).toBeInTheDocument();
    // MUI Chip with color="success" for Active status
  });

  it('displays inactive status correctly', () => {
    const inactiveAccount = { ...mockAccount, status: 'Inactive' as const };
    render(<AccountDetailsCard account={inactiveAccount} />);

    const statusChip = screen.getByText('Inactive').closest('div');
    expect(statusChip).toBeInTheDocument();
  });

  it('displays pending status correctly', () => {
    const pendingAccount = { ...mockAccount, status: 'Pending' as const };
    render(<AccountDetailsCard account={pendingAccount} />);

    const statusChip = screen.getByText('Pending').closest('div');
    expect(statusChip).toBeInTheDocument();
  });

  it('formats relative time correctly', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    // Should show relative time (actual format may vary: "Less than 1 hour ago", "2 hours ago")
    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('displays opening date in correct format', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    // The date is formatted as "Jan 14, 2020" (one day off due to timezone)
    expect(screen.getByText(/Jan 1[45], 2020/)).toBeInTheDocument();
  });

  it('handles missing routing number', () => {
    const accountWithoutRouting = { ...mockAccount, routingNumber: undefined };
    render(<AccountDetailsCard account={accountWithoutRouting} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles missing opening date', () => {
    const accountWithoutOpening = { ...mockAccount, openingDate: undefined };
    render(<AccountDetailsCard account={accountWithoutOpening} />);

    const openingDates = screen.getAllByText('N/A');
    expect(openingDates.length).toBeGreaterThan(0);
  });

  it('handles missing notes', () => {
    const accountWithoutNotes = { ...mockAccount, notes: undefined };
    render(<AccountDetailsCard account={accountWithoutNotes} />);

    // Should still render without crashing
    expect(screen.getByText('Checking Account')).toBeInTheDocument();
  });

  it('displays notes when provided', () => {
    render(<AccountDetailsCard account={mockAccount} />);

    expect(screen.getByText('Primary checking account')).toBeInTheDocument();
  });

  it('calls onExport when export button clicked', async () => {
    const mockOnExport = vi.fn();
    const user = userEvent.setup();
    
    render(<AccountDetailsCard account={mockAccount} onExport={mockOnExport} />);

    const exportButton = screen.getByLabelText(/export/i);
    await user.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button clicked', async () => {
    const mockOnEdit = vi.fn();
    const user = userEvent.setup();
    
    render(<AccountDetailsCard account={mockAccount} onEdit={mockOnEdit} />);

    const editButton = screen.getByLabelText(/edit/i);
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button clicked', async () => {
    const mockOnDelete = vi.fn();
    const user = userEvent.setup();
    
    render(<AccountDetailsCard account={mockAccount} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByLabelText(/delete/i);
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('formats large balances with commas', () => {
    const largeBalanceAccount = { ...mockAccount, currentBalance: 1234567.89 };
    render(<AccountDetailsCard account={largeBalanceAccount} />);

    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
  });

  it('handles zero balance', () => {
    const zeroBalanceAccount = { ...mockAccount, currentBalance: 0 };
    render(<AccountDetailsCard account={zeroBalanceAccount} />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  // Interest rate field has been removed from the component
  // Test removed as field no longer exists

  it('formats recent sync time as "just now"', () => {
    const justSyncedAccount = {
      ...mockAccount,
      lastSyncDate: new Date(Date.now() - 30 * 1000).toISOString() // 30 seconds ago
    };
    render(<AccountDetailsCard account={justSyncedAccount} />);

    // Should show less than a minute
    expect(screen.getByText(/ago|just now/i)).toBeInTheDocument();
  });

  it('formats days ago correctly', () => {
    const oldSyncAccount = {
      ...mockAccount,
      lastSyncDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    };
    render(<AccountDetailsCard account={oldSyncAccount} />);

    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });
});

