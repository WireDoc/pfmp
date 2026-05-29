import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryBreakdownChart from '../../../../views/dashboard/spending/CategoryBreakdownChart';

// Recharts uses ResizeObserver and SVG; stub the chart so the test focuses on grouping logic.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="rc">{children}</div>,
  };
});

vi.mock('../../../../services/spendingApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/spendingApi')>(
    '../../../../services/spendingApi',
  );
  return {
    ...actual,
    getByCategory: vi.fn(),
  };
});

import { getByCategory } from '../../../../services/spendingApi';

const mockGet = getByCategory as ReturnType<typeof vi.fn>;

describe('CategoryBreakdownChart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groups duplicate Plaid primary rows and shows aggregated total', async () => {
    mockGet.mockResolvedValue([
      { plaidPrimaryCategory: 'RENT_AND_UTILITIES', plaidDetailedCategory: 'RENT', actualAmount: 1500.99, budgetedAmount: 1500, transactionCount: 1 },
      { plaidPrimaryCategory: 'RENT_AND_UTILITIES', plaidDetailedCategory: 'GAS_AND_ELECTRICITY', actualAmount: 120, budgetedAmount: 150, transactionCount: 2 },
      { plaidPrimaryCategory: 'RENT_AND_UTILITIES', plaidDetailedCategory: 'INTERNET', actualAmount: 80, budgetedAmount: 100, transactionCount: 1 },
      { plaidPrimaryCategory: 'FOOD_AND_DRINK', plaidDetailedCategory: 'RESTAURANTS', actualAmount: 350, budgetedAmount: 400, transactionCount: 8 },
    ]);
    render(<CategoryBreakdownChart userId={20} />);
    // Both primaries show up in the right-side list (and the recharts Legend).
    await waitFor(() => expect(screen.getAllByText('RENT_AND_UTILITIES').length).toBeGreaterThan(0));
    // Aggregated total for RENT_AND_UTILITIES = 1500.99 + 120 + 80 = 1700.99
    expect(screen.getByText('$1,700.99')).toBeInTheDocument();
    expect(screen.getAllByText('FOOD_AND_DRINK').length).toBeGreaterThan(0);
  });

  it('expands a grouped row to reveal detailed categories', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue([
      { plaidPrimaryCategory: 'RENT_AND_UTILITIES', plaidDetailedCategory: 'RENT', actualAmount: 1500, budgetedAmount: 1500, transactionCount: 1 },
      { plaidPrimaryCategory: 'RENT_AND_UTILITIES', plaidDetailedCategory: 'INTERNET', actualAmount: 80, budgetedAmount: 100, transactionCount: 1 },
    ]);
    render(<CategoryBreakdownChart userId={20} />);
    const primaryLabels = await screen.findAllByText('RENT_AND_UTILITIES');
    // The right-side list row is the clickable one (Pie legend uses an SVG <text>, not a <p>).
    const listRow = primaryLabels.find(el => el.tagName.toLowerCase() === 'p');
    expect(listRow).toBeTruthy();
    await user.click(listRow!);
    expect(screen.getByText(/RENT · 1 tx/)).toBeInTheDocument();
    expect(screen.getByText(/INTERNET · 1 tx/)).toBeInTheDocument();
  });

  it('shows empty-state message when there is no spending', async () => {
    mockGet.mockResolvedValue([]);
    render(<CategoryBreakdownChart userId={20} />);
    await waitFor(() => expect(screen.getByText(/No spending recorded/i)).toBeInTheDocument());
  });
});
