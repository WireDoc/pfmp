import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CryptoSettingsView } from '../../views/settings/CryptoSettingsView';
import type { CryptoHolding, ExchangeConnection } from '../../services/cryptoApi';

const sampleConnection: ExchangeConnection = {
  exchangeConnectionId: 1,
  provider: 'Kraken',
  nickname: 'Main',
  status: 'Active',
  lastSyncAt: '2025-12-15T10:00:00Z',
  lastSyncError: null,
  scopes: ['query_funds', 'query_ledger'],
  dateCreated: '2025-12-15T09:00:00Z',
};

const sampleHolding: CryptoHolding = {
  cryptoHoldingId: 11,
  exchangeConnectionId: 1,
  provider: 'Kraken',
  symbol: 'BTC',
  coinGeckoId: 'bitcoin',
  quantity: 0.5,
  avgCostBasisUsd: null,
  marketValueUsd: 32500,
  isStaked: false,
  stakingApyPercent: null,
  lastPriceAt: '2025-12-15T10:00:00Z',
};

const listExchangeConnections = vi.fn();
const listCryptoHoldings = vi.fn();
const createExchangeConnection = vi.fn();
const syncExchangeConnection = vi.fn();
const deleteExchangeConnection = vi.fn();

vi.mock('../../services/cryptoApi', () => ({
  listExchangeConnections: (...args: unknown[]) => listExchangeConnections(...args),
  listCryptoHoldings: (...args: unknown[]) => listCryptoHoldings(...args),
  createExchangeConnection: (...args: unknown[]) => createExchangeConnection(...args),
  syncExchangeConnection: (...args: unknown[]) => syncExchangeConnection(...args),
  deleteExchangeConnection: (...args: unknown[]) => deleteExchangeConnection(...args),
  listCryptoTransactions: vi.fn().mockResolvedValue([]),
  listCryptoTaxLots: vi.fn().mockResolvedValue([]),
  getCryptoStakingSummary: vi.fn().mockResolvedValue({
    totalStakedValueUsd: 0,
    weightedApyPercent: null,
    ytdRewardsUsd: 0,
    stakedAssetCount: 0,
    byAsset: [],
  }),
  getCryptoRealizedPnL: vi.fn().mockResolvedValue({
    year: null,
    totalProceedsUsd: 0,
    totalCostBasisUsd: 0,
    totalShortTermGainUsd: 0,
    totalLongTermGainUsd: 0,
    totalRealizedGainUsd: 0,
    bySymbol: [],
  }),
}));

vi.mock('../../dev/devUserState', () => ({
  useDevUserId: vi.fn(() => 1),
}));

function renderView() {
  return render(
    <MemoryRouter>
      <CryptoSettingsView />
    </MemoryRouter>
  );
}

describe('CryptoSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listExchangeConnections.mockResolvedValue([sampleConnection]);
    listCryptoHoldings.mockResolvedValue([sampleHolding]);
  });

  it('renders connections and holdings tables', async () => {
    renderView();
    expect(await screen.findByText('Crypto Exchanges')).toBeInTheDocument();
    expect(await screen.findByText('Main')).toBeInTheDocument();
    expect(await screen.findByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('opens link dialog and creates a new connection', async () => {
    const newConn: ExchangeConnection = { ...sampleConnection, exchangeConnectionId: 2, nickname: 'Secondary' };
    createExchangeConnection.mockResolvedValue(newConn);

    renderView();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /link exchange/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/api key/i), 'test-api-key-123');
    await user.type(within(dialog).getByLabelText(/api secret/i), 'test-secret-abc');
    await user.click(within(dialog).getByRole('button', { name: /link exchange/i }));

    await waitFor(() => {
      expect(createExchangeConnection).toHaveBeenCalledWith(1, expect.objectContaining({
        provider: 'Kraken',
        apiKey: 'test-api-key-123',
        apiSecret: 'test-secret-abc',
      }));
    });
  });

  it('shows backend error from connection creation', async () => {
    createExchangeConnection.mockRejectedValue({
      response: { data: 'API key has trading or withdrawal scopes; PFMP requires a read-only key.' },
    });

    renderView();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /link exchange/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/api key/i), 'k-test');
    await user.type(within(dialog).getByLabelText(/api secret/i), 's-test');
    await user.click(within(dialog).getByRole('button', { name: /link exchange/i }));

    await waitFor(() => expect(createExchangeConnection).toHaveBeenCalled());
    // Dialog should stay open (no successful close) so the user can correct and retry.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
  });
});

// Local helper: scoped queries within an element
import { within } from '@testing-library/react';
