import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CryptoSummaryCard from '../../../views/dashboard/CryptoSummaryCard';

vi.mock('../../../services/cryptoApi', () => ({
  listCryptoHoldings: vi.fn(),
  listExchangeConnections: vi.fn(),
}));

import { listCryptoHoldings, listExchangeConnections } from '../../../services/cryptoApi';

const renderCard = (refreshKey = 0) =>
  render(
    <MemoryRouter>
      <CryptoSummaryCard userId={20} refreshKey={refreshKey} />
    </MemoryRouter>,
  );

describe('CryptoSummaryCard (dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Link Exchange CTA when no exchanges are linked', async () => {
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listCryptoHoldings as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderCard();
    await waitFor(() => expect(screen.getByText('Cryptocurrency')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Link Exchange/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Details/i })).not.toBeInTheDocument();
  });

  it('renders total balance, Last updated, Synced, and View Details when active', async () => {
    (listExchangeConnections as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        exchangeConnectionId: 1,
        provider: 'Kraken',
        nickname: null,
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
    ]);
    renderCard();
    await waitFor(() => expect(screen.getByText('$30,000.00')).toBeInTheDocument());
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Details/i })).toBeInTheDocument();
    expect(screen.getByText(/1 position across 1 exchange/i)).toBeInTheDocument();
  });

  it('shows Pending sync when no successful sync has been recorded', async () => {
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
    (listCryptoHoldings as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderCard();
    await waitFor(() => expect(screen.getByText('Pending sync')).toBeInTheDocument());
  });
});
