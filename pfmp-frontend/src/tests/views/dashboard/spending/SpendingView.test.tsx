import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mswServer } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';
import { SpendingView } from '../../../../views/dashboard/SpendingView';

vi.mock('../../../../dev/devUserState', () => ({
  useDevUserId: () => 20,
  getDevUserId: () => 20,
  setDevUserId: vi.fn(),
  isDevUserReady: () => true,
  useDevUserReady: () => true,
  subscribeDevUser: () => () => {},
}));

vi.mock('../../../../contexts/auth/useAuth', () => ({
  useAuth: () => ({ user: { localAccountId: '20' }, isDev: true, logout: vi.fn() }),
}));

// Recharts ResponsiveContainer needs a non-zero size; stub it.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="rc">{children}</div>,
  };
});

const cashFlow = {
  totalMonthlyInflows: 15200,
  totalMonthlyOutflows: 3048.82,
  netMonthlyCashFlow: 12151.18,
  inflows: {
    byIncomeType: [
      { type: 'Salary', amount: 12000, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false },
    ],
    savingsAllotments: [],
  },
  outflows: { byPlaidPrimary: [], insurancePremiums: [], paycheckDeductedInsurance: [], externalAllotments: [] },
  variances: [],
  asOfUtc: '2026-05-17T00:00:00Z',
};

beforeEach(() => {
  mswServer.use(
    http.get(/\/api\/spending\/cash-flow-summary/, () => HttpResponse.json(cashFlow)),
    http.get(/\/api\/spending\/summary/, () => HttpResponse.json({
      from: '2026-05-01T00:00:00Z', to: '2026-06-01T00:00:00Z',
      totalInflows: 15200, totalOutflows: 3048.82, net: 12151.18, transactionCount: 12,
    })),
    http.get(/\/api\/spending\/by-category/, () => HttpResponse.json([
      { plaidPrimaryCategory: 'FOOD_AND_DRINK', plaidDetailedCategory: 'RESTAURANTS', actualAmount: 350, budgetedAmount: 400, transactionCount: 5 },
    ])),
    http.get(/\/api\/spending\/budgets/, () => HttpResponse.json([])),
    http.get(/\/api\/spending\/top-merchants/, () => HttpResponse.json([])),
    http.get(/\/api\/spending\/transactions/, () => HttpResponse.json([])),
    http.get(/\/api\/spending\/recurring/, () => HttpResponse.json([])),
    http.get(/\/api\/spending\/anomalies/, () => HttpResponse.json([])),
  );
});

describe('SpendingView', () => {
  it('renders the page header, month picker, and all panels with MSW-backed data', async () => {
    render(
      <MemoryRouter>
        <SpendingView />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /^Spending$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Select month/i)).toBeInTheDocument();

    // CashFlowSummaryCard
    await waitFor(() => expect(screen.getAllByText('$15,200.00').length).toBeGreaterThan(0));
    // MonthlySummaryCard — uses same numbers in this fixture
    expect(screen.getByText('Spending Summary')).toBeInTheDocument();
    // CategoryBreakdownChart
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    // BudgetVsActualPanel
    expect(screen.getByText('Budget vs Actual')).toBeInTheDocument();
    // TopMerchantsTable + RecentTransactionsTable
    expect(screen.getByText('Top Merchants')).toBeInTheDocument();
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    // P3: RecurringStreamsPanel + AnomalyAlertsCard
    expect(screen.getByText('Recurring Streams')).toBeInTheDocument();
    expect(screen.getByText('Spending Anomalies')).toBeInTheDocument();
  });
});
