import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { HoldingTransactionModal } from '../../components/holdings/HoldingTransactionModal';
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

const openTypeMenuAndSelect = async (user: ReturnType<typeof userEvent.setup>, optionMatcher: RegExp) => {
  // Type select starts on "Buy More Shares" — click that to open menu
  const trigger = screen.getByText('Buy More Shares');
  fireEvent.mouseDown(trigger);
  const listbox = within(screen.getByRole('listbox'));
  await user.click(listbox.getByText(optionMatcher));
};

describe('HoldingTransactionModal — Buy / DRIP (existing behavior)', () => {
  it('renders modal with holding info when open', () => {
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByText(/Buy More.*AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/10 shares/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shares to Add/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price Per Share/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fee/)).toBeInTheDocument();
    expect(screen.getByText(/Funding Source/)).toBeInTheDocument();
  });

  it('does not render when holding is null', () => {
    const { container } = render(
      <HoldingTransactionModal open={true} holding={null} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows preview when quantity and price are entered', async () => {
    const user = userEvent.setup();
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');

    await waitFor(() => {
      expect(screen.getByText(/Preview/)).toBeInTheDocument();
      expect(screen.getByText(/Additional cost/)).toBeInTheDocument();
      expect(screen.getByText(/New quantity.*15/)).toBeInTheDocument();
    });
  });

  it('submits a BUY transaction with the AddShares payload shape', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.click(screen.getByRole('button', { name: /Buy Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'BUY',
        payload: expect.objectContaining({
          quantity: 5,
          pricePerShare: 200,
          transactionType: 'BUY',
          fundingSource: FundingSource.ExternalDeposit,
        }),
      }));
    });
  });

  it('shows error when quantity is 0', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '0');
    await user.type(screen.getByLabelText(/Price Per Share/), '100');
    await user.click(screen.getByRole('button', { name: /Buy Shares/ }));

    await waitFor(() => {
      expect(screen.getByText(/Quantity must be greater than 0/)).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits a DRIP transaction without funding source', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await openTypeMenuAndSelect(user, /Dividend Reinvestment/);
    expect(screen.getByText(/Dividend Reinvestment.*AAPL/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Shares to Add/), '2');
    await user.type(screen.getByLabelText(/Price Per Share/), '180');
    await user.click(screen.getByRole('button', { name: /Reinvest Dividend/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'DIVIDEND_REINVEST',
        payload: expect.objectContaining({
          transactionType: 'DIVIDEND_REINVEST',
          quantity: 2,
          pricePerShare: 180,
          fundingSource: undefined,
        }),
      }));
    });
  });

  it('includes fee in BUY save request when provided', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByLabelText(/Shares to Add/), '5');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.type(screen.getByLabelText(/Fee/), '9.99');
    await user.click(screen.getByRole('button', { name: /Buy Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'BUY',
        payload: expect.objectContaining({ fee: 9.99 }),
      }));
    });
  });
});

describe('HoldingTransactionModal — Sell', () => {
  it('switches to Sell mode, shows the cash-credit notice, and routes to sell payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await openTypeMenuAndSelect(user, /Sell Shares/);
    expect(screen.getByText(/Sell Shares.*AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/Proceeds credit the account's cash balance automatically/)).toBeInTheDocument();
    expect(screen.queryByText(/Funding Source/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Shares to Sell/), '3');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.type(screen.getByLabelText(/Fee/), '5');

    // Realized gain preview: (200 - 150) * 3 - 5 = $145; net = 600 - 5 = $595
    await waitFor(() => {
      expect(screen.getByText(/Estimated realized gain\/loss.*\$145/)).toBeInTheDocument();
      expect(screen.getByText(/Net to cash balance.*\$595/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Sell Shares/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'SELL',
        payload: expect.objectContaining({
          quantity: 3,
          pricePerShare: 200,
          fee: 5,
        }),
      }));
    });
  });

  it('blocks sell when quantity exceeds current holding', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await openTypeMenuAndSelect(user, /Sell Shares/);
    await user.type(screen.getByLabelText(/Shares to Sell/), '11');
    await user.type(screen.getByLabelText(/Price Per Share/), '200');
    await user.click(screen.getByRole('button', { name: /Sell Shares/ }));

    await waitFor(() => {
      expect(screen.getByText(/Cannot sell 11 shares — only 10 available/)).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('warns when the entered sell quantity closes the holding', async () => {
    const user = userEvent.setup();
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={vi.fn()} />
    );

    await openTypeMenuAndSelect(user, /Sell Shares/);
    await user.type(screen.getByLabelText(/Shares to Sell/), '10');
    await user.type(screen.getByLabelText(/Price Per Share/), '180');

    await waitFor(() => {
      expect(screen.getByText(/holding will be closed/)).toBeInTheDocument();
    });
  });
});

describe('HoldingTransactionModal — Cash Dividend', () => {
  it('submits a DIVIDEND_CASH payload with amount only (no qty/price fields)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await openTypeMenuAndSelect(user, /Cash Dividend/);
    expect(screen.getByText(/Cash Dividend.*AAPL/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Shares to Add/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Price Per Share/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Dividend Amount/), '42.50');

    await waitFor(() => {
      expect(screen.getByText(/Credit to account cash balance.*\$42.50/)).toBeInTheDocument();
      expect(screen.getByText(/Shares unchanged.*10/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Record Dividend/ }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'DIVIDEND_CASH',
        payload: expect.objectContaining({ amount: 42.5 }),
      }));
    });
  });

  it('blocks submission when dividend amount is missing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <HoldingTransactionModal open={true} holding={mockHolding} onClose={vi.fn()} onSave={onSave} />
    );

    await openTypeMenuAndSelect(user, /Cash Dividend/);
    // No amount entered — submit button should be disabled
    expect(screen.getByRole('button', { name: /Record Dividend/ })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
