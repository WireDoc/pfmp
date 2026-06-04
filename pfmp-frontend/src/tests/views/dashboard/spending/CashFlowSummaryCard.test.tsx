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
      outflows: { byPlaidPrimary: [], insurancePremiums: [], paycheckDeductedInsurance: [], externalAllotments: [] },
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
        paycheckDeductedInsurance: [],
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

  it('renders paycheck-deducted insurance as an informational section, not as outflow', async () => {
    mockGet.mockResolvedValue({
      totalMonthlyInflows: 5000,
      totalMonthlyOutflows: 124,
      netMonthlyCashFlow: 4876,
      inflows: { byIncomeType: [{ type: 'Salary', amount: 5000, source: 'Profile', isProfileOnly: true, isAmbiguousAllotment: false }], savingsAllotments: [] },
      outflows: {
        byPlaidPrimary: [],
        insurancePremiums: [{ policyType: 'Auto', policyName: null, monthlyAmount: 124, renewalDate: null }],
        paycheckDeductedInsurance: [{ policyType: 'Health', policyName: 'FEHB BCBS Standard', monthlyAmount: 290, renewalDate: null }],
        externalAllotments: [],
      },
      variances: [],
      asOfUtc: '2026-06-03T00:00:00Z',
    });
    render(<CashFlowSummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText(/Paycheck-deducted Insurance/i)).toBeInTheDocument());
    expect(screen.getByText('FEHB BCBS Standard')).toBeInTheDocument();
    // Total outflow shown is $124, NOT $124 + $290 — FEHB doesn't double-count.
    expect(screen.getByText('$124.00')).toBeInTheDocument();
    // FEHB is shown without the leading "-" since it's not an outflow line.
    expect(screen.queryByText('-$290.00')).not.toBeInTheDocument();
  });

  it('renders variance alerts when present', async () => {
    mockGet.mockResolvedValue({
      totalMonthlyInflows: 10000,
      totalMonthlyOutflows: 5000,
      netMonthlyCashFlow: 5000,
      inflows: { byIncomeType: [], savingsAllotments: [] },
      outflows: { byPlaidPrimary: [], insurancePremiums: [], paycheckDeductedInsurance: [], externalAllotments: [] },
      variances: [
        { stream: 'TotalInflows', profile: 10000, plaid: 8500, deltaPercent: 15, severity: 'info' },
      ],
      asOfUtc: '2026-05-17T00:00:00Z',
    });
    render(<CashFlowSummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText(/15% delta/)).toBeInTheDocument());
  });
});
