import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CryptoTransactionsPanel from '../../../views/dashboard/CryptoTransactionsPanel';
import type { CryptoTransaction, ExchangeConnection } from '../../../services/cryptoApi';

const listCryptoTransactions = vi.fn();

vi.mock('../../../services/cryptoApi', () => ({
  listCryptoTransactions: (...args: unknown[]) => listCryptoTransactions(...args),
}));

const conn: ExchangeConnection = {
  exchangeConnectionId: 7,
  provider: 'Kraken',
  nickname: 'Main',
  status: 'Active',
  lastSyncAt: '2026-04-01T10:00:00Z',
  lastSyncError: null,
  scopes: ['query_funds'],
  dateCreated: '2025-12-15T09:00:00Z',
};

const txs: CryptoTransaction[] = [
  {
    cryptoTransactionId: 1,
    exchangeConnectionId: 7,
    provider: 'Kraken',
    exchangeTxId: 'kraken-1',
    transactionType: 'Buy',
    symbol: 'BTC',
    quantity: 0.25,
    priceUsd: 60000,
    feeUsd: 5,
    executedAt: '2026-03-15T10:00:00Z',
  },
  {
    cryptoTransactionId: 2,
    exchangeConnectionId: 7,
    provider: 'Kraken',
    exchangeTxId: 'kraken-2',
    transactionType: 'StakingReward',
    symbol: 'ETH',
    quantity: 0.05,
    priceUsd: 3000,
    feeUsd: null,
    executedAt: '2026-03-20T10:00:00Z',
  },
];

describe('CryptoTransactionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCryptoTransactions.mockResolvedValue(txs);
  });

  it('renders rows with type chips and currency formatting', async () => {
    render(<CryptoTransactionsPanel userId={1} connections={[conn]} />);

    expect(await screen.findByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('StakingReward')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    // BTC value: 0.25 * 60000 = $15,000.00
    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
  });

  it('shows empty-state message when no transactions match', async () => {
    listCryptoTransactions.mockResolvedValueOnce([]);
    render(<CryptoTransactionsPanel userId={1} connections={[conn]} />);

    expect(await screen.findByText(/no transactions match/i)).toBeInTheDocument();
  });

  it('refetches when the date-range filter changes', async () => {
    render(<CryptoTransactionsPanel userId={1} connections={[conn]} />);
    await screen.findByText('Buy');

    const user = userEvent.setup();
    const dateFilter = screen.getByLabelText(/date range filter/i);
    await user.click(dateFilter);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/all time/i));

    await waitFor(() => {
      // Initial call (90d) + the all-time call
      expect(listCryptoTransactions).toHaveBeenCalledTimes(2);
      const lastCall = listCryptoTransactions.mock.calls.at(-1);
      expect(lastCall?.[1]).toEqual(expect.objectContaining({ since: undefined }));
    });
  });
});
