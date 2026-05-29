import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopMerchantsTable from '../../../../views/dashboard/spending/TopMerchantsTable';

vi.mock('../../../../services/spendingApi', () => ({
  getTopMerchants: vi.fn(),
}));

import { getTopMerchants } from '../../../../services/spendingApi';

const mock = getTopMerchants as ReturnType<typeof vi.fn>;

describe('TopMerchantsTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders merchants sorted by total spend', async () => {
    mock.mockResolvedValue([
      { merchant: 'Costco', totalSpent: 420.55, transactionCount: 3, topCategory: 'FOOD_AND_DRINK' },
      { merchant: 'Shell', totalSpent: 180.12, transactionCount: 5, topCategory: 'TRANSPORTATION' },
    ]);
    render(<TopMerchantsTable userId={20} />);
    await waitFor(() => expect(screen.getByText('Costco')).toBeInTheDocument());
    expect(screen.getByText('Shell')).toBeInTheDocument();
    expect(screen.getByText('$420.55')).toBeInTheDocument();
    expect(screen.getByText('$180.12')).toBeInTheDocument();
  });

  it('shows empty state when no merchants', async () => {
    mock.mockResolvedValue([]);
    render(<TopMerchantsTable userId={20} />);
    await waitFor(() => expect(screen.getByText(/No merchant spending/i)).toBeInTheDocument());
  });
});
