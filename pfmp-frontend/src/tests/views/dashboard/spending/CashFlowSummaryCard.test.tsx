import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CashFlowSummaryCard from '../../../../views/dashboard/spending/CashFlowSummaryCard';

vi.mock('../../../../services/spendingApi', () => ({
  getCashFlowSummary: vi.fn(),
}));

import { getCashFlowSummary } from '../../../../services/spendingApi';

const mockGet = getCashFlowSummary as ReturnType<typeof vi.fn>;

describe('CashFlowSummaryCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inflows, outflows, and net for a positive cash flow', async () => {
    mockGet.mockResolvedValue({
      totalMonthlyInflows: 15200,
      totalMonthlyOutflows: 3048.82,
      netMonthlyCashFlow: 12151.18,
      inflows: {
        byIncomeType: [
          { type: 'Salary', amount: 12000, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false },
          { type: 'VADisability', amount: 2500, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false },
          { type: 'Other', amount: 700, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false },
        ],
        savingsAllotments: [],
      },
      outflows: { byPlaidPrimary: [], insurancePremiums: [], externalAllotments: [] },
      variances: [],
      asOfUtc: '2026-05-17T00:00:00Z',
    });
    render(<CashFlowSummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText('$15,200.00')).toBeInTheDocument());
    expect(screen.getByText('$3,048.82')).toBeInTheDocument();
    expect(screen.getByText('+$12,151.18')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('VADisability')).toBeInTheDocument();
  });

  it('shows savings allotments as informational and external allotments as outflow', async () => {
    mockGet.mockResolvedValue({
      totalMonthlyInflows: 8000,
      totalMonthlyOutflows: 500,
      netMonthlyCashFlow: 7500,
      inflows: {
        byIncomeType: [{ type: 'Salary', amount: 8000, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false }],
        savingsAllotments: [
          { incomeStreamId: 'a', name: 'TSP Savings', amount: 500, destinationAccountId: 1, destinationName: 'Vanguard' },
        ],
      },
      outflows: {
        byPlaidPrimary: [],
        insurancePremiums: [],
        externalAllotments: [
          { incomeStreamId: 'b', name: 'Child Support', amount: 500, notes: null },
        ],
      },
      variances: [],
      asOfUtc: '2026-05-17T00:00:00Z',
    });
    render(<CashFlowSummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText('Savings Allotments (informational)')).toBeInTheDocument());
    expect(screen.getByText('External Allotments (outflow)')).toBeInTheDocument();
    expect(screen.getByText('TSP Savings')).toBeInTheDocument();
    expect(screen.getByText('Child Support')).toBeInTheDocument();
  });

  it('renders variance alerts when present', async () => {
    mockGet.mockResolvedValue({
      totalMonthlyInflows: 10000,
      totalMonthlyOutflows: 5000,
      netMonthlyCashFlow: 5000,
      inflows: { byIncomeType: [], savingsAllotments: [] },
      outflows: { byPlaidPrimary: [], insurancePremiums: [], externalAllotments: [] },
      variances: [
        { stream: 'TotalInflows', profile: 10000, plaid: 8500, deltaPercent: 15, severity: 'info' },
      ],
      asOfUtc: '2026-05-17T00:00:00Z',
    });
    render(<CashFlowSummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText(/15% delta/)).toBeInTheDocument());
  });
});
