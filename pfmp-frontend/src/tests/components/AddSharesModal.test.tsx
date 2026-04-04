import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AddSharesModal } from '../../components/holdings/AddSharesModal';
import type { Holding } from '../../types/holdings';
import { FundingSource } from '../../types/holdings';

const mockHolding: Holding = {
  holdingId: 1,
  accountId: 100,
  symbol: 'AAPL',
  name: 'Apple Inc',
  assetType: 'Stock',
  quantity: 10,
  averageCostBasis: 150,
  currentPrice: 180,
  currentValue: 1800,
  totalCostBasis: 1500,
  unrealizedGainLoss: 300,
  unrealizedGainLossPercentage: 20,
  annualDividendYield: null,
  stakingAPY: null,
  annualDividendIncome: null,
  lastDividendDate: null,
  nextDividendDate: null,
  beta: null,
  sectorAllocation: null,
  geographicAllocation: null,
  isQualifiedDividend: false,
  purchaseDate: '2025-01-01',
  isLongTermCapitalGains: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  lastPriceUpdate: '2026-04-01T00:00:00Z',
  notes: null,
};

describe('AddSharesModal', () => {
  it('renders modal with holding info when open', () => {
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByText(/Buy More.*AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/10 shares/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shares to Add/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price Per Share/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fee/)).toBeInTheDocument();
    expect(screen.getByText(/Funding Source/)).toBeInTheDocument();
    expect(screen.getByLabelText(/External deposit/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Purchase from account cash balance/)).toBeInTheDocument();
  });

  it('does not render when holding is null', () => {
    const { container } = render(
      <AddSharesModal open={true} holding={null} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows preview when quantity and price are entered', async () => {
    const user = userEvent.setup();
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');

    await waitFor(() => {
      expect(screen.getByText(/Preview/)).toBeInTheDocument();
      expect(screen.getByText(/Additional cost/)).toBeInTheDocument();
      expect(screen.getByText(/New quantity.*15/)).toBeInTheDocument();
    });
  });

  it('calls onSave with correct data when submitted', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        quantity: 5,
        pricePerShare: 200,
        transactionType: 'BUY',
        fundingSource: FundingSource.ExternalDeposit,
      }));
    });
  });

  it('shows error when quantity is 0', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '0');
    await user.type(screen.getByLabelText(/Price Per Share/), '100');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(screen.getByText(/Quantity must be greater than 0/)).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows switching to DRIP type', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    // Open the MUI Select by mouseDown on its trigger
    const selectTrigger = screen.getByText('Buy More Shares');
    fireEvent.mouseDown(selectTrigger);
    const listbox = within(screen.getByRole('listbox'));
    await user.click(listbox.getByText(/Dividend Reinvestment/));

    expect(screen.getByText(/Dividend Reinvestment.*AAPL/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Shares to Add/), '2');
    await user.type(screen.getByLabelText(/Price Per Share/), '180');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        transactionType: 'DIVIDEND_REINVEST',
        quantity: 2,
        pricePerShare: 180,
      }));
    });
  });

  it('shows error message when save fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('resets form on close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={onClose} onSave={vi.fn()} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.click(screen.getByRole('button', { name: /Cancel/ }));

    expect(onClose).toHaveBeenCalled();
  });

  it('includes fee in save request when provided', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.type(screen.getByLabelText(/Fee/), '9.99');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        quantity: 5,
        pricePerShare: 200,
        fee: 9.99,
      }));
    });
  });

  it('shows fee in preview when entered', async () => {
    const user = userEvent.setup();
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.type(screen.getByLabelText(/Fee/), '10');

    await waitFor(() => {
      expect(screen.getByText(/Fee.*\$10/)).toBeInTheDocument();
      expect(screen.getByText(/Total out-of-pocket.*\$1,010/)).toBeInTheDocument();
    });
  });

  it('allows changing funding source', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    // Default is ExternalDeposit — switch to CashBalance
    await user.click(screen.getByLabelText(/Purchase from account cash balance/));

    await user.type(screen.getByLabelText(/Shares to Add/), '3');
    await user.type(screen.getByLabelText(/Price Per Share/), '150');
    await user.click(screen.getByRole('button', { name: /Add Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        fundingSource: FundingSource.CashBalance,
        quantity: 3,
        pricePerShare: 150,
      }));
    });
  });

  it('does not show Existing Position in funding source options', () => {
    render(
      <AddSharesModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.queryByLabelText(/Existing position/)).not.toBeInTheDocument();
  });
});
