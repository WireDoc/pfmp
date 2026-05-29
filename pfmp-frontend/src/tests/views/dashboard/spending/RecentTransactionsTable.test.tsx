import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentTransactionsTable from '../../../../views/dashboard/spending/RecentTransactionsTable';

vi.mock('../../../../services/spendingApi', () => ({
  getSpendingTransactions: vi.fn(),
}));

import { getSpendingTransactions } from '../../../../services/spendingApi';

const mock = getSpendingTransactions as ReturnType<typeof vi.fn>;

describe('RecentTransactionsTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders transactions with sign-colored amounts', async () => {
    mock.mockResolvedValue([
      {
        cashTransactionId: 1, cashAccountId: 1, liabilityAccountId: null,
        transactionDate: '2026-05-15T00:00:00Z', amount: -42.55,
        merchant: 'Costco', description: null, category: null,
        plaidCategory: 'FOOD_AND_DRINK', plaidCategoryDetailed: null,
      },
      {
        cashTransactionId: 2, cashAccountId: 1, liabilityAccountId: null,
        transactionDate: '2026-05-14T00:00:00Z', amount: 100,
        merchant: 'Refund', description: null, category: null,
        plaidCategory: 'INCOME', plaidCategoryDetailed: null,
      },
    ]);
    render(<RecentTransactionsTable userId={20} />);
    await waitFor(() => expect(screen.getByText('Costco')).toBeInTheDocument());
    expect(screen.getByText('-$42.55')).toBeInTheDocument();
    expect(screen.getByText('+$100.00')).toBeInTheDocument();
  });

  it('shows empty state when there are no transactions', async () => {
    mock.mockResolvedValue([]);
    render(<RecentTransactionsTable userId={20} />);
    await waitFor(() => expect(screen.getByText(/No transactions/i)).toBeInTheDocument());
  });
});
