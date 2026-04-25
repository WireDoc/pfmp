import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CryptoAccountsCard } from '../../../components/crypto/CryptoAccountsCard';

vi.mock('../../../services/cryptoApi', () => ({
  listCryptoHoldings: vi.fn(),
  listExchangeConnections: vi.fn(),
}));

import { listCryptoHoldings, listExchangeConnections } from '../../../services/cryptoApi';

const renderCard = () =>
  render(
    <MemoryRouter>
      <CryptoAccountsCard userId={20} />
    </MemoryRouter>,
  );

describe('CryptoAccountsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CTA when no exchanges are linked', async () => {
    (listCryptoHoldings as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/Link Kraken or Binance\.US/i)).toBeInTheDocument();
    });
  });

  it('renders holdings rows and total when connections exist', async () => {
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([
      { exchangeConnectionId: 1, provider: 'Kraken', label: 'Kraken Main', isActive: true },
    ]);
    (listCryptoHoldings as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        cryptoHoldingId: 1,
        exchangeConnectionId: 1,
        provider: 'Kraken',
        symbol: 'BTC',
        coinGeckoId: 'bitcoin',
        quantity: 0.5,
        avgCostBasisUsd: null,
        marketValueUsd: 30000,
        isStaked: false,
        stakingApyPercent: null,
        lastPriceAt: null,
      },
      {
        cryptoHoldingId: 2,
        exchangeConnectionId: 1,
        provider: 'Kraken',
        symbol: 'USD',
        coinGeckoId: null,
        quantity: 650,
        avgCostBasisUsd: null,
        marketValueUsd: 650,
        isStaked: false,
        stakingApyPercent: null,
        lastPriceAt: null,
      },
    ]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
    expect(screen.getByText('USD')).toBeInTheDocument();
    // Total = 30,650
    expect(screen.getByText('$30,650.00')).toBeInTheDocument();
  });
});
