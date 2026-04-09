import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CashFlowWidget } from '../../components/dashboard/CashFlowWidget';

const mockCashFlowData = {
  totalMonthlyIncome: 8500,
  totalMonthlyExpenses: 5200,
  netCashFlow: 3300,
  savingsRate: 38.8,
  incomeBreakdown: [
    { category: 'Salary', monthlyAmount: 7000 },
    { category: 'VADisability', monthlyAmount: 1500 },
  ],
  expenseBreakdown: [
    { category: 'Housing', monthlyAmount: 2000 },
    { category: 'Transportation', monthlyAmount: 800 },
    { category: 'Food', monthlyAmount: 600 },
  ],
  computedAt: '2026-04-09T12:00:00Z',
};

vi.mock('../../services/dashboard/overviewApi', () => ({
  fetchCashFlowSummary: vi.fn(),
}));

import { fetchCashFlowSummary } from '../../services/dashboard/overviewApi';
const mockFetchCashFlow = vi.mocked(fetchCashFlowSummary);

// Mock recharts to avoid JSDOM rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Cell: () => <div />,
}));

function renderWidget() {
  return render(
    <MemoryRouter>
      <CashFlowWidget />
    </MemoryRouter>,
  );
}

describe('CashFlowWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockFetchCashFlow.mockReturnValue(new Promise(() => {}));
    renderWidget();
    expect(screen.getByTestId('cash-flow-loading')).toBeInTheDocument();
  });

  it('renders income, expenses, and net amounts', async () => {
    mockFetchCashFlow.mockResolvedValue(mockCashFlowData);
    renderWidget();
    expect(await screen.findByText('$8,500')).toBeInTheDocument();
    expect(screen.getByText('$5,200')).toBeInTheDocument();
    expect(screen.getByText('+$3,300')).toBeInTheDocument();
  });

  it('shows savings rate chip', async () => {
    mockFetchCashFlow.mockResolvedValue(mockCashFlowData);
    renderWidget();
    expect(await screen.findByText('38.8% savings rate')).toBeInTheDocument();
  });

  it('renders the heading', async () => {
    mockFetchCashFlow.mockResolvedValue(mockCashFlowData);
    renderWidget();
    expect(await screen.findByText('Monthly Cash Flow')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockFetchCashFlow.mockRejectedValue(new Error('Network error'));
    renderWidget();
    expect(await screen.findByText('Unable to load cash flow data')).toBeInTheDocument();
  });
});
