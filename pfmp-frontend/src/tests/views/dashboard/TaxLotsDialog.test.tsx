import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TaxLotsDialog from '../../../views/dashboard/TaxLotsDialog';
import type { CryptoTaxLot } from '../../../services/cryptoApi';

const listCryptoTaxLots = vi.fn();

vi.mock('../../../services/cryptoApi', () => ({
  listCryptoTaxLots: (...args: unknown[]) => listCryptoTaxLots(...args),
}));

const longTermLot: CryptoTaxLot = {
  cryptoTaxLotId: 1,
  exchangeConnectionId: 7,
  provider: 'Kraken',
  symbol: 'BTC',
  acquiredAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  originalQuantity: 0.5,
  remainingQuantity: 0.5,
  costBasisUsdPerUnit: 30000,
  realizedProceedsUsd: 0,
  realizedCostBasisUsd: 0,
  realizedShortTermGainUsd: 0,
  realizedLongTermGainUsd: 0,
  isClosed: false,
  closedAt: null,
  isRewardLot: false,
};

const shortTermLot: CryptoTaxLot = {
  ...longTermLot,
  cryptoTaxLotId: 2,
  acquiredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  originalQuantity: 0.1,
  remainingQuantity: 0.1,
  costBasisUsdPerUnit: 60000,
};

describe('TaxLotsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when closed', () => {
    render(<TaxLotsDialog open={false} onClose={() => {}} userId={1} symbol="BTC" />);
    expect(listCryptoTaxLots).not.toHaveBeenCalled();
  });

  it('lists open lots with Short-term and Long-term badges', async () => {
    listCryptoTaxLots.mockResolvedValue([longTermLot, shortTermLot]);
    render(<TaxLotsDialog open={true} onClose={() => {}} userId={1} symbol="BTC" />);

    await waitFor(() => expect(listCryptoTaxLots).toHaveBeenCalledWith(1, { symbol: 'BTC', openOnly: true }));
    expect(await screen.findByText('Long-term')).toBeInTheDocument();
    expect(screen.getByText('Short-term')).toBeInTheDocument();
    expect(screen.getByText(/open tax lots — btc/i)).toBeInTheDocument();
  });

  it('shows empty-state when no open lots are returned', async () => {
    listCryptoTaxLots.mockResolvedValue([]);
    render(<TaxLotsDialog open={true} onClose={() => {}} userId={1} symbol="BTC" />);

    expect(await screen.findByText(/no open lots for btc/i)).toBeInTheDocument();
  });
});
