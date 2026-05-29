import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonthlySummaryCard from '../../../../views/dashboard/spending/MonthlySummaryCard';

vi.mock('../../../../services/spendingApi', () => ({
  getMonthlySummary: vi.fn(),
  recomputeRollups: vi.fn(),
}));

import { getMonthlySummary, recomputeRollups } from '../../../../services/spendingApi';

const mockSummary = getMonthlySummary as ReturnType<typeof vi.fn>;
const mockRecompute = recomputeRollups as ReturnType<typeof vi.fn>;

describe('MonthlySummaryCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders totals and transaction count', async () => {
    mockSummary.mockResolvedValue({
      from: '2026-05-01T00:00:00Z',
      to: '2026-06-01T00:00:00Z',
      totalInflows: 15200,
      totalOutflows: 3048.82,
      net: 12151.18,
      transactionCount: 42,
    });
    render(<MonthlySummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByText('$15,200.00')).toBeInTheDocument());
    expect(screen.getByText('$3,048.82')).toBeInTheDocument();
    expect(screen.getByText('+$12,151.18')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls recompute on button click and shows confirmation', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue({
      from: '2026-05-01T00:00:00Z', to: '2026-06-01T00:00:00Z',
      totalInflows: 0, totalOutflows: 0, net: 0, transactionCount: 0,
    });
    mockRecompute.mockResolvedValue({ recomputed: true, asOf: '2026-05-17T12:00:00Z' });
    render(<MonthlySummaryCard userId={20} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Recompute$/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Recompute$/i }));
    await waitFor(() => expect(mockRecompute).toHaveBeenCalledWith(20));
  });
});
