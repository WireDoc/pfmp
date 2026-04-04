import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mswServer } from '../mocks/server';
import { mockDashboardSummary, http, HttpResponse } from '../mocks/handlers';
import { __resetDashboardServiceForTest } from '../../services/dashboard';
import { AccountsView } from '../../views/dashboard/AccountsView';

// Mock devUserState — must include getDevUserId for apiDashboardService
vi.mock('../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: (cb: () => void) => () => {},
}));

const baseSummary = {
  userName: 'Test User',
  netWorth: { totalAssets: 250000, totalLiabilities: 50000, netWorth: 200000, lastUpdated: '2026-04-01' },
  accounts: [
    { id: 1, name: 'Checking', institution: 'Navy Federal', type: 'Checking', balance: 5000, syncStatus: 'synced', isCashAccount: true, lastSync: '2026-04-01' },
    { id: 2, name: 'Savings', institution: 'Navy Federal', type: 'Savings', balance: 15000, syncStatus: 'synced', isCashAccount: true, lastSync: '2026-04-01' },
    { id: 3, name: 'Brokerage', institution: 'Fidelity', type: 'brokerage', balance: 80000, syncStatus: 'synced', isCashAccount: false, lastSync: '2026-04-01' },
    { id: 4, name: 'Roth IRA', institution: 'Vanguard', type: 'retirement', balance: 45000, syncStatus: 'synced', isCashAccount: false, lastSync: '2026-04-01' },
  ],
  properties: [
    { id: 10, address: '123 Main St', type: 'Primary Residence', estimatedValue: 350000, mortgageBalance: 200000, lastUpdated: '2026-04-01' },
  ],
  liabilities: [
    { id: 20, name: 'Auto Loan', type: 'Auto', currentBalance: 15000, minimumPayment: 400, interestRate: 4.5, lastUpdated: '2026-04-01' },
  ],
  insights: [],
  alerts: [],
  advice: [],
  tasks: [],
};

function renderAccountsView() {
  __resetDashboardServiceForTest();
  mswServer.use(
    ...mockDashboardSummary(baseSummary),
    // Handle TSP summary-lite request
    http.get(/\/financial-profile\/\d+\/tsp\/summary-lite/, () =>
      HttpResponse.json({ items: [], totalBalance: 0, asOfUtc: null })
    ),
  );
  return render(
    <MemoryRouter>
      <AccountsView />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountsView', () => {
  it('renders the page heading', async () => {
    renderAccountsView();
    expect(await screen.findByText('All Accounts')).toBeInTheDocument();
  });

  it('shows summary cards with totals', async () => {
    renderAccountsView();
    await waitFor(() => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Total Liabilities')).toBeInTheDocument();
      expect(screen.getByText('Net Worth')).toBeInTheDocument();
    });
  });

  it('renders cash accounts section', async () => {
    renderAccountsView();
    await waitFor(() => {
      expect(screen.getByText('Cash Accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('renders investment accounts section', async () => {
    renderAccountsView();
    await waitFor(() => {
      expect(screen.getByText('Investment Accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('Brokerage')).toBeInTheDocument();
    expect(screen.getByText('Roth IRA')).toBeInTheDocument();
  });

  it('renders real estate section', async () => {
    renderAccountsView();
    await waitFor(() => {
      expect(screen.getByText('Real Estate')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
    });
  });

  it('renders liabilities section', async () => {
    renderAccountsView();
    await waitFor(() => {
      expect(screen.getByText('Liabilities')).toBeInTheDocument();
      expect(screen.getByText('Auto Loan')).toBeInTheDocument();
    });
  });

  it('filters accounts by name', async () => {
    const user = userEvent.setup();
    renderAccountsView();
    await screen.findByText('Checking');

    const filterInput = screen.getByPlaceholderText(/filter accounts/i);
    await user.type(filterInput, 'Navy');

    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeInTheDocument();
      expect(screen.getByText('Savings')).toBeInTheDocument();
    });

    // Investment accounts from other institutions should be filtered out
    const investmentSection = screen.getByText('Investment Accounts').closest('[class*="MuiPaper"]');
    if (investmentSection) {
      expect(investmentSection.textContent).toContain('0 accounts');
    }
  });

  it('shows account count chips per section', async () => {
    renderAccountsView();
    await waitFor(() => {
      // Both cash and investment sections have 2 accounts each
      expect(screen.getAllByText('2 accounts').length).toBe(2);
    });
  });

  it('renders with empty accounts gracefully', async () => {
    __resetDashboardServiceForTest();
    mswServer.use(
      ...mockDashboardSummary({
        ...baseSummary,
        accounts: [],
        properties: [],
        liabilities: [],
      }),
      http.get(/\/financial-profile\/\d+\/tsp\/summary-lite/, () =>
        HttpResponse.json({ items: [], totalBalance: 0, asOfUtc: null })
      ),
    );
    render(
      <MemoryRouter>
        <AccountsView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No cash accounts')).toBeInTheDocument();
      expect(screen.getByText('No investment accounts')).toBeInTheDocument();
    });
  });

  it('shows error alert on API failure', async () => {
    __resetDashboardServiceForTest();
    mswServer.use(
      ...mockDashboardSummary({}, { status: 500 }),
      http.get(/\/financial-profile\/\d+\/tsp\/summary-lite/, () =>
        HttpResponse.json({ items: [], totalBalance: 0, asOfUtc: null })
      ),
    );
    render(
      <MemoryRouter>
        <AccountsView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load accounts/i)).toBeInTheDocument();
    });
  });

  it('calculates net worth correctly (no TSP double-count, liabilities subtracted)', async () => {
    const summaryWithTsp = {
      ...baseSummary,
      accounts: [
        ...baseSummary.accounts,
        { id: 'tsp_aggregate', name: 'Thrift Savings Plan', institution: 'TSP', type: 'retirement', balance: 100000, syncStatus: 'synced', isCashAccount: false, lastSync: '2026-04-01' },
      ],
    };
    __resetDashboardServiceForTest();
    mswServer.use(
      ...mockDashboardSummary(summaryWithTsp),
      http.get(/\/financial-profile\/\d+\/tsp\/summary-lite/, () =>
        HttpResponse.json({ items: [{ fundCode: 'C', units: 100, currentMarketValue: 100000 }], totalBalance: 100000, asOfUtc: '2026-04-01' })
      ),
    );
    render(
      <MemoryRouter>
        <AccountsView />
      </MemoryRouter>
    );

    // accounts (no tsp_aggregate): 5000 + 15000 + 80000 + 45000 = 145000
    // properties: 350000
    // TSP: 100000
    // => totalAssets = 595000
    // liabilities: 15000
    // => netWorth = 580000
    await waitFor(() => {
      const totalAssetsCard = screen.getByText('Total Assets').closest('div')!;
      expect(totalAssetsCard.textContent).toContain('595,000');
    });
    const liabCard = screen.getByText('Total Liabilities').closest('div')!;
    expect(liabCard.textContent).toContain('15,000');
    const nwCard = screen.getByText('Net Worth').closest('div')!;
    expect(nwCard.textContent).toContain('580,000');
  });
});
