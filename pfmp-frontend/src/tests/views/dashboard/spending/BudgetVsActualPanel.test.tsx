import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BudgetVsActualPanel from '../../../../views/dashboard/spending/BudgetVsActualPanel';
import type { ExpenseBudget } from '../../../../services/spendingApi';

vi.mock('../../../../services/spendingApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/spendingApi')>(
    '../../../../services/spendingApi',
  );
  return {
    ...actual,
    listBudgets: vi.fn(),
    getByCategory: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
  };
});

import { listBudgets, getByCategory } from '../../../../services/spendingApi';

const mockBudgets = listBudgets as ReturnType<typeof vi.fn>;
const mockCategory = getByCategory as ReturnType<typeof vi.fn>;

function makeBudget(partial: Partial<ExpenseBudget>): ExpenseBudget {
  return {
    expenseBudgetId: 1,
    userId: 20,
    category: 'Food',
    monthlyAmount: 500,
    isEstimated: false,
    notes: null,
    periodType: 'Monthly',
    effectiveFrom: '2026-01-01T00:00:00Z',
    effectiveTo: null,
    rolloverEnabled: false,
    rolloverAmount: 0,
    plaidPrimaryCategory: 'FOOD_AND_DRINK',
    plaidDetailedCategory: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('BudgetVsActualPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flags an over-budget category with a chip', async () => {
    mockBudgets.mockResolvedValue([
      makeBudget({ plaidPrimaryCategory: 'FOOD_AND_DRINK', monthlyAmount: 400 }),
    ]);
    mockCategory.mockResolvedValue([
      { plaidPrimaryCategory: 'FOOD_AND_DRINK', plaidDetailedCategory: 'RESTAURANTS', actualAmount: 500, budgetedAmount: 400, transactionCount: 4 },
    ]);
    render(<BudgetVsActualPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('FOOD_AND_DRINK')).toBeInTheDocument());
    expect(screen.getByText(/Over budget/i)).toBeInTheDocument();
  });

  it('flags categories with spending but no budget as "No budget"', async () => {
    mockBudgets.mockResolvedValue([]);
    mockCategory.mockResolvedValue([
      { plaidPrimaryCategory: 'TRAVEL', plaidDetailedCategory: 'FLIGHTS', actualAmount: 800, budgetedAmount: null, transactionCount: 1 },
    ]);
    render(<BudgetVsActualPanel userId={20} />);
    await waitFor(() => expect(screen.getByText('TRAVEL')).toBeInTheDocument());
    expect(screen.getByText(/No budget/i)).toBeInTheDocument();
  });

  it('opens the editor dialog when "New Budget" is clicked', async () => {
    const user = userEvent.setup();
    mockBudgets.mockResolvedValue([]);
    mockCategory.mockResolvedValue([]);
    render(<BudgetVsActualPanel userId={20} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /New Budget/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /New Budget/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /New Budget/i })).toBeInTheDocument();
  });
});
