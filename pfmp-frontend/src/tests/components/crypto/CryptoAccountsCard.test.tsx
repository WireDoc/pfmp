import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders Cryptocurrency Accounts heading + CTA when no exchanges are linked', async () => {
    (listCryptoHoldings as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByText('Cryptocurrency Accounts')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Link Exchange/i })).toBeInTheDocument();
  });

  it('renders holdings rows with collapse arrow and no Manage button', async () => {
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        exchangeConnectionId: 1,
        provider: 'Kraken',
        nickname: 'Kraken Main',
        status: 'Active',
        lastSyncAt: '2026-04-25T12:00:00Z',
        lastSyncError: null,
        scopes: [],
        dateCreated: '2026-04-01T12:00:00Z',
      },
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
        lastPriceAt: '2026-04-25T12:00:00Z',
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
        lastPriceAt: '2026-04-25T12:00:00Z',
      },
    ]);
    renderCard();
    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('$30,650.00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Manage/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Collapse cryptocurrency accounts/i)).toBeInTheDocument();
  });

  it('collapses and re-expands when the header is clicked', async () => {
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        exchangeConnectionId: 1,
        provider: 'Kraken',
        nickname: null,
        status: 'Active',
        lastSyncAt: null,
        lastSyncError: null,
        scopes: [],
        dateCreated: '2026-04-01T12:00:00Z',
      },
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
        lastPriceAt: '2026-04-25T12:00:00Z',
      },
    ]);
    const user = userEvent.setup();
    renderCard();
    await waitFor(() => expect(screen.getByText('BTC')).toBeInTheDocument());
    await user.click(screen.getByText('Cryptocurrency Accounts'));
    expect(screen.getByLabelText(/Expand cryptocurrency accounts/i)).toBeInTheDocument();
  });
});
