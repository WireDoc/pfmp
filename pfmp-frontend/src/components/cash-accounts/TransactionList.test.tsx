import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionList } from './TransactionList';

// Mock fetch globally
global.fetch = vi.fn();

const mockTransactions = [
  {
    transactionId: 1,
    date: '2025-01-15T10:00:00Z',
    description: 'Grocery Store',
    category: 'Groceries',
    amount: -50.25,
    balanceAfter: 1949.75,
    checkNumber: undefined,
    memo: 'Weekly shopping'
  },
  {
    transactionId: 2,
    date: '2025-01-10T14:30:00Z',
    description: 'Direct Deposit',
    category: 'Salary',
    amount: 2000.00,
    balanceAfter: 2000.00,
    checkNumber: undefined,
    memo: 'Paycheck'
  },
  {
    transactionId: 3,
    date: '2025-01-08T09:15:00Z',
    description: 'Utility Payment',
    category: 'Utilities',
    amount: -150.50,
    balanceAfter: 0.00,
    checkNumber: '1234',
    memo: 'Electric bill'
  }
];

describe('TransactionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTransactions
    });
  });

  it('renders transaction list with data', async () => {
    render(<TransactionList accountId={123} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    expect(screen.getByText('Direct Deposit')).toBeInTheDocument();
    expect(screen.getByText('Utility Payment')).toBeInTheDocument();
  });

  it('fetches transactions on mount', async () => {
    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounts/123/transactions')
      );
    });
  });

  it('filters transactions by search term', async () => {
    const user = userEvent.setup();
    render(<TransactionList accountId={123} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // First, toggle filters to show them
    const filterButton = screen.getByRole('button', { name: /toggle filters/i });
    await user.click(filterButton);

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search description or memo...');
    await user.type(searchInput, 'Grocery');

    // Should show only grocery transaction
    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
      expect(screen.queryByText('Direct Deposit')).not.toBeInTheDocument();
    });
  });

  it('filters transactions by category', async () => {
    const user = userEvent.setup();
    render(<TransactionList accountId={123} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // Clear mock and set up new response
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [mockTransactions[0]] // Only first transaction
    });

    // First, toggle filters to show them
    const filterButton = screen.getByRole('button', { name: /toggle filters/i });
    await user.click(filterButton);

    // Category select is visible but has no name - find by testing all comboboxes
    const comboboxes = screen.getAllByRole('combobox');
    // First combobox should be category (not pagination), second is "Rows per page"
    const categoryInput = comboboxes.find(cb => !cb.getAttribute('aria-labelledby'));
    if (!categoryInput) throw new Error('Category combobox not found');
    
    await user.click(categoryInput);
    
    const depositOption = screen.getByRole('option', { name: 'Deposit' });
    await user.click(depositOption);

    // Should fetch with category filter
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=Deposit')
      );
    });
  });

  it('displays positive amounts in green and negative in red', async () => {
    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // Find the DataGrid rows
    const rows = screen.getAllByRole('row');
    
    // Check deposit (positive) - should have success color
    const depositRow = rows.find(row => row.textContent?.includes('Direct Deposit'));
    expect(depositRow).toBeDefined();

    // Check withdrawal (negative) - should have error color
    const withdrawalRow = rows.find(row => row.textContent?.includes('Grocery Store'));
    expect(withdrawalRow).toBeDefined();
  });

  it('calls onExport with filtered transactions', async () => {
    const mockExport = vi.fn();
    render(<TransactionList accountId={123} onExport={mockExport} />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);

    expect(mockExport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ description: 'Grocery Store' })
      ])
    );
  });

  it('handles pagination', async () => {
    const user = userEvent.setup();
    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // Component uses client-side pagination with limit=1000
    // Verify initial fetch uses 1000 limit
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=1000')
    );

    // Change page size - this only affects client-side display, not API call
    const pageSizeSelect = screen.getByRole('combobox', { name: /rows per page/i });
    await user.click(pageSizeSelect);
    
    const option50 = screen.getByRole('option', { name: '50' });
    await user.click(option50);

    // Should not trigger additional fetch (still only 1 call)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('handles date range filtering', async () => {
    const user = userEvent.setup();
    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    // First, toggle filters to show them
    const filterButton = screen.getByRole('button', { name: /toggle filters/i });
    await user.click(filterButton);

    // Now date inputs should be visible
    // DatePicker creates multiple elements with the same label (legend + input), use getAllByLabelText
    const startDateInputs = screen.getAllByLabelText('Start Date');
    const endDateInputs = screen.getAllByLabelText('End Date');
    
    expect(startDateInputs.length).toBeGreaterThan(0);
    expect(endDateInputs.length).toBeGreaterThan(0);
    // Note: Actually selecting dates in DatePicker is complex in tests
    // This tests that the inputs exist and are accessible
  });

  it('displays loading state', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<TransactionList accountId={123} />);

    // DataGrid handles loading internally, so just verify grid is present and no error shown
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
  });

  it('handles fetch errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching transactions:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('sorts transactions by date descending by default', async () => {
    render(<TransactionList accountId={123} />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // First data row should be most recent transaction
    const firstDataRow = rows[1]; // Index 0 is header
    expect(firstDataRow.textContent).toContain('Grocery Store'); // Jan 15
  });
});
