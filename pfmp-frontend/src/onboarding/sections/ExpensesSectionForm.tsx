import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  fetchExpensesProfile,
  upsertExpensesProfile,
  type ExpensesProfilePayload,
  type ExpenseBudgetPayload,
  type FinancialProfileSectionStatusValue,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

type ExpensesSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type ExpenseFormState = {
  id: string;
  category: string;
  monthlyAmount: string;
  isEstimated: boolean;
  notes: string;
};

const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'housing', label: 'Housing & utilities' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'food', label: 'Groceries & dining' },
  { value: 'childcare', label: 'Childcare / education' },
  { value: 'healthcare', label: 'Healthcare & insurance' },
  { value: 'lifestyle', label: 'Lifestyle & subscriptions' },
  { value: 'debt-service', label: 'Debt service' },
  { value: 'savings', label: 'Savings contributions' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_EXPENSE: ExpenseFormState = {
  id: 'expense-1',
  category: 'housing',
  monthlyAmount: '',
  isEstimated: false,
  notes: '',
};

function createExpense(index: number): ExpenseFormState {
  return { ...DEFAULT_EXPENSE, id: `expense-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildExpensePayloads(expenses: ExpenseFormState[]): ExpenseBudgetPayload[] {
  const payloads: ExpenseBudgetPayload[] = [];

  expenses.forEach((expense) => {
    const hasValue = expense.monthlyAmount.trim() !== '' || expense.notes.trim() !== '';

    if (!hasValue) {
      return;
    }

    payloads.push({
      category: expense.category || 'other',
      monthlyAmount: parseNumber(expense.monthlyAmount) ?? null,
      isEstimated: expense.isEstimated,
      notes: expense.notes.trim() || null,
    });
  });

  return payloads;
}

export default function ExpensesSectionForm({ userId, onStatusChange, currentStatus }: ExpensesSectionFormProps) {
  const [expenses, setExpenses] = useState<ExpenseFormState[]>([createExpense(1)]);
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  // autosave replaces manual save state & error messaging

  const payloadExpenses: ExpenseBudgetPayload[] = useMemo(() => buildExpensePayloads(expenses), [expenses]);
  const canRemoveRows = expenses.length > 1;

  type HydratedState = {
    expenses: ExpenseFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: ExpensesProfilePayload): HydratedState => {
    const hydratedExpenses = (payload.expenses ?? []).map((expense, index) => ({
      id: `expense-${index + 1}`,
      category: expense.category ?? 'other',
      monthlyAmount: expense.monthlyAmount != null ? String(expense.monthlyAmount) : '',
      isEstimated: expense.isEstimated ?? false,
      notes: expense.notes ?? '',
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      expenses: hydratedExpenses.length > 0 ? hydratedExpenses : [createExpense(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ expenses: nextExpenses, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      setExpenses(nextExpenses);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'expenses',
    userId,
    fetcher: fetchExpensesProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleExpenseChange = <K extends keyof ExpenseFormState>(id: string, key: K, value: ExpenseFormState[K]) => {
    setExpenses((prev) => prev.map((expense) => (expense.id === id ? { ...expense, [key]: value } : expense)));
  };

  const handleAddExpense = () => {
    setExpenses((prev) => [...prev, createExpense(prev.length + 1)]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => {
      const remaining = prev.filter((expense) => expense.id !== id);
      return remaining.length > 0 ? remaining : [createExpense(1)];
    });
  };

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (!checked) setOptOutReason('');
  };

  const deriveStatus = useCallback<() => FinancialProfileSectionStatusValue>(() => {
    if (optedOut) return 'opted_out';
    return payloadExpenses.length > 0 ? 'completed' : 'needs_info';
  }, [optedOut, payloadExpenses.length]);

  const buildPayload = useCallback<() => ExpensesProfilePayload>(() => {
    if (optedOut) {
      return {
        expenses: [],
        optOut: {
          isOptedOut: true,
          reason: optOutReason.trim() || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return { expenses: payloadExpenses, optOut: undefined };
  }, [optedOut, optOutReason, payloadExpenses]);

  const persistExpenses = useCallback(async () => {
    const payload = buildPayload();
    await upsertExpensesProfile(userId, payload);
  }, [buildPayload, userId]);

  const { status: autoStatus, flush, isDirty, lastSavedAt, error } = useAutoSaveForm({
    data: { expenses, optedOut, optOutReason },
    debounceMs: 800,
    determineStatus: () => deriveStatus(),
    persist: async () => {
      await persistExpenses();
      return deriveStatus();
    },
    onStatusResolved: (next) => onStatusChange(next),
    onPersistError: () => {
      /* handled by hook error */
    },
  });

  useEffect(() => {
    interface PFMPWindow extends Window { __pfmpCurrentSectionFlush?: () => Promise<void>; }
    const w: PFMPWindow = window as PFMPWindow;
    w.__pfmpCurrentSectionFlush = flush;
    return () => {
      if (w.__pfmpCurrentSectionFlush === flush) {
        w.__pfmpCurrentSectionFlush = undefined;
      }
    };
  }, [flush]);

  return (
    <Box component="form" noValidate>
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I’ll estimate my expenses later"
        />

        {optedOut ? (
          <TextField
            label="Why are you opting out?"
            value={optOutReason}
            onChange={(event) => setOptOutReason(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={4}>
            {expenses.map((expense, index) => (
              <Box key={expense.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#f7fbff', position: 'relative' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id={`${expense.id}-category-label`}>Category</InputLabel>
                        <Select
                          labelId={`${expense.id}-category-label`}
                          label="Category"
                          value={expense.category}
                          onChange={(event) => handleExpenseChange(expense.id, 'category', event.target.value)}
                        >
                          {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        type="number"
                        label="Monthly amount ($)"
                        value={expense.monthlyAmount}
                        onChange={(event) => handleExpenseChange(expense.id, 'monthlyAmount', event.target.value)}
                        inputProps={{ min: 0, step: 25 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={expense.isEstimated}
                            onChange={(event) => handleExpenseChange(expense.id, 'isEstimated', event.target.checked)}
                          />
                        }
                        label="This is an estimate"
                      />
                      <TextField
                        label="Notes"
                        value={expense.notes}
                        onChange={(event) => handleExpenseChange(expense.id, 'notes', event.target.value)}
                        placeholder="Seasonal swings, upcoming changes…"
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    </Stack>
                  </Box>
                  {canRemoveRows && (
                    <Tooltip title="Remove expense">
                      <IconButton onClick={() => handleRemoveExpense(expense.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Expense {index + 1}
                </Typography>
              </Box>
            ))}

            <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddExpense} sx={{ alignSelf: 'flex-start' }}>
              Add another expense
            </Button>
          </Stack>
        )}

        <Stack direction="row" spacing={2} alignItems="center">
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={error} />
          <Typography variant="body2" color="text.secondary">
            Even rough estimates help us highlight cashflow gaps and reserve targets.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
