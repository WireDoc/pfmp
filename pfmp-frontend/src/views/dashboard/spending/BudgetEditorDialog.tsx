import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import {
  createBudget,
  updateBudget,
  deleteBudget,
  type BudgetPeriodType,
  type ExpenseBudget,
  type ExpenseBudgetInput,
} from '../../../services/spendingApi';

// Plaid primary categories — keep in sync with the backend's
// `SpendingOptions.InternalTransferCategories` references and Wave 14 doc.
const PLAID_PRIMARIES = [
  'INCOME',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'LOAN_PAYMENTS',
  'BANK_FEES',
  'ENTERTAINMENT',
  'FOOD_AND_DRINK',
  'GENERAL_MERCHANDISE',
  'HOME_IMPROVEMENT',
  'MEDICAL',
  'PERSONAL_CARE',
  'GENERAL_SERVICES',
  'GOVERNMENT_AND_NON_PROFIT',
  'TRANSPORTATION',
  'TRAVEL',
  'RENT_AND_UTILITIES',
] as const;

const PERIOD_TYPES: BudgetPeriodType[] = ['Monthly', 'Weekly', 'Biweekly', 'Annual'];

interface BudgetEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: number;
  budget: ExpenseBudget | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function BudgetEditorDialog({
  open,
  onClose,
  onSaved,
  userId,
  budget,
}: BudgetEditorDialogProps) {
  const [form, setForm] = useState<ExpenseBudgetInput>(() => emptyForm(userId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      if (budget) {
        setForm({
          userId: budget.userId,
          category: budget.category,
          monthlyAmount: budget.monthlyAmount,
          isEstimated: budget.isEstimated,
          notes: budget.notes,
          periodType: budget.periodType,
          effectiveFrom: budget.effectiveFrom?.slice(0, 10) ?? todayIso(),
          effectiveTo: budget.effectiveTo ? budget.effectiveTo.slice(0, 10) : null,
          rolloverEnabled: budget.rolloverEnabled,
          rolloverAmount: budget.rolloverAmount,
          plaidPrimaryCategory: budget.plaidPrimaryCategory,
          plaidDetailedCategory: budget.plaidDetailedCategory,
        });
      } else {
        setForm(emptyForm(userId));
      }
      setError(null);
    }
  }, [open, budget, userId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Normalize date strings to UTC midnight ISO strings so the backend sees a real DateTime.
      const payload: ExpenseBudgetInput = {
        ...form,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : null,
      };
      if (budget) {
        await updateBudget(budget.expenseBudgetId, payload);
      } else {
        await createBudget(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!budget) return;
    if (!confirm(`Delete budget "${budget.category}"?`)) return;
    setDeleting(true);
    try {
      await deleteBudget(budget.expenseBudgetId);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{budget ? 'Edit Budget' : 'New Budget'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Category (display)"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            select
            label="Plaid Primary Category"
            value={form.plaidPrimaryCategory ?? ''}
            onChange={e => setForm(f => ({ ...f, plaidPrimaryCategory: e.target.value || null }))}
            fullWidth
            helperText="Used to match Plaid transactions against this budget"
          >
            <MenuItem value="">(none)</MenuItem>
            {PLAID_PRIMARIES.map(p => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Plaid Detailed Category (optional)"
            value={form.plaidDetailedCategory ?? ''}
            onChange={e => setForm(f => ({ ...f, plaidDetailedCategory: e.target.value || null }))}
            fullWidth
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              label="Amount"
              type="number"
              value={form.monthlyAmount}
              onChange={e => setForm(f => ({ ...f, monthlyAmount: Number(e.target.value) }))}
              fullWidth
              inputProps={{ step: '0.01', min: 0 }}
              required
            />
            <TextField
              select
              label="Period"
              value={form.periodType}
              onChange={e => setForm(f => ({ ...f, periodType: e.target.value as BudgetPeriodType }))}
              fullWidth
            >
              {PERIOD_TYPES.map(p => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              label="Effective From"
              type="date"
              value={form.effectiveFrom?.slice(0, 10) ?? ''}
              onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Effective To (optional)"
              type="date"
              value={form.effectiveTo?.slice(0, 10) ?? ''}
              onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value || null }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.rolloverEnabled}
                onChange={e => setForm(f => ({ ...f, rolloverEnabled: e.target.checked }))}
              />
            }
            label="Rollover unspent amount each period"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isEstimated}
                onChange={e => setForm(f => ({ ...f, isEstimated: e.target.checked }))}
              />
            }
            label="This is an estimate (not a hard target)"
          />
          <TextField
            label="Notes"
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {budget && (
            <Button color="error" onClick={handleDelete} disabled={deleting || saving}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </Box>
        <Box>
          <Button onClick={onClose} disabled={saving || deleting}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || deleting}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

function emptyForm(userId: number): ExpenseBudgetInput {
  return {
    userId,
    category: '',
    monthlyAmount: 0,
    isEstimated: false,
    notes: null,
    periodType: 'Monthly',
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
    rolloverEnabled: false,
    rolloverAmount: 0,
    plaidPrimaryCategory: null,
    plaidDetailedCategory: null,
  };
}
