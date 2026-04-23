import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CashTransactionForm } from '../../components/cash-accounts/CashTransactionForm';
import type { CashTransactionResponse } from '../../services/cashTransactionsApi';

// Mock the cash transactions API service
vi.mock('../../services/cashTransactionsApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/cashTransactionsApi')>(
    '../../services/cashTransactionsApi'
  );
  return {
    ...actual,
    createCashTransaction: vi.fn(),
    updateCashTransaction: vi.fn(),
    deleteCashTransaction: vi.fn(),
  };
});

import {
  createCashTransaction,
  updateCashTransaction,
  deleteCashTransaction,
} from '../../services/cashTransactionsApi';

const mockedCreate = vi.mocked(createCashTransaction);
const mockedUpdate = vi.mocked(updateCashTransaction);
const mockedDelete = vi.mocked(deleteCashTransaction);

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

const sampleTransaction: CashTransactionResponse = {
  cashTransactionId: 42,
  cashAccountId: ACCOUNT_ID,
  transactionType: 'Withdrawal',
  amount: -125.5,
  transactionDate: '2026-04-01T00:00:00Z',
  description: 'Groceries',
  category: 'Groceries',
  merchant: 'Costco',
  checkNumber: undefined,
  fee: undefined,
  isPending: false,
  isRecurring: false,
  notes: 'Weekly shopping',
};

describe('CashTransactionForm', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
  });

  it('renders Add Transaction title in create mode', () => {
    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /Add Transaction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument();
  });

  it('renders Edit Transaction title and pre-fills fields when transaction provided', () => {
    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        transaction={sampleTransaction}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /Edit Transaction/i })).toBeInTheDocument();
    // Description populated (Category Autocomplete also has 'Groceries' so we use the explicit description label)
    expect(screen.getByRole('textbox', { name: /^Description$/i })).toHaveValue('Groceries');
    expect(screen.getByRole('textbox', { name: /Merchant/i })).toHaveValue('Costco');
    // Amount shown as absolute value
    expect(screen.getByDisplayValue('125.5')).toBeInTheDocument();
    // Save and Delete buttons present
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });

  it('submits create with positive amount for Deposit type', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    mockedCreate.mockResolvedValue({ ...sampleTransaction, transactionType: 'Deposit', amount: 200 });

    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    // Default type is Deposit; just enter amount
    await user.type(screen.getByRole('spinbutton', { name: /Amount/i }), '200');
    await user.click(screen.getByRole('button', { name: /Add Transaction/i }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const [accountIdArg, request] = mockedCreate.mock.calls[0];
    expect(accountIdArg).toBe(ACCOUNT_ID);
    expect(request.transactionType).toBe('Deposit');
    expect(request.amount).toBe(200);
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('converts amount to negative for Withdrawal type', async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ...sampleTransaction, amount: -50 });

    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Switch type to Withdrawal
    await user.click(screen.getByRole('combobox', { name: /Transaction Type/i }));
    await user.click(await screen.findByRole('option', { name: 'Withdrawal' }));

    await user.type(screen.getByRole('spinbutton', { name: /Amount/i }), '50');
    await user.click(screen.getByRole('button', { name: /Add Transaction/i }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][1].amount).toBe(-50);
  });

  it('shows validation error when amount is zero', async () => {
    const user = userEvent.setup();
    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Add Transaction/i }));
    expect(await screen.findByText(/Amount must be greater than zero/i)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('calls update API when editing', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockedUpdate.mockResolvedValue({ ...sampleTransaction, description: 'Updated' });

    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        transaction={sampleTransaction}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    const description = screen.getByRole('textbox', { name: /^Description$/i });
    await user.clear(description);
    await user.type(description, 'Updated description');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    const [accountIdArg, txIdArg, request] = mockedUpdate.mock.calls[0];
    expect(accountIdArg).toBe(ACCOUNT_ID);
    expect(txIdArg).toBe(42);
    expect(request.description).toBe('Updated description');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('requires two-step confirmation before deleting', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockedDelete.mockResolvedValue();

    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        transaction={sampleTransaction}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    // First click reveals confirmation
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(await screen.findByText(/Are you sure\?/i)).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    // Confirm delete
    await user.click(screen.getByRole('button', { name: /Confirm Delete/i }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(ACCOUNT_ID, 42));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows API error message on failure', async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new Error('Server error: 500'));

    render(
      <CashTransactionForm
        open
        cashAccountId={ACCOUNT_ID}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.type(screen.getByRole('spinbutton', { name: /Amount/i }), '100');
    await user.click(screen.getByRole('button', { name: /Add Transaction/i }));

    expect(await screen.findByText(/Server error: 500/i)).toBeInTheDocument();
  });
});
