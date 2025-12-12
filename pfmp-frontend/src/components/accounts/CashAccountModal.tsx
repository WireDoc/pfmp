/**
 * Cash Account Modal - Add/Edit Cash Accounts
 * 
 * Specialized modal for cash account management (checking, savings, etc.)
 * Integrates with CashAccountsController backend API.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CashAccountResponse, CreateCashAccountRequest, UpdateCashAccountRequest } from '../../services/cashAccountsApi';

interface Props {
  open: boolean;
  userId: number;
  account?: CashAccountResponse | null; // If provided, edit mode; otherwise create mode
  onClose: () => void;
  onSave: (request: CreateCashAccountRequest | UpdateCashAccountRequest, accountId?: string) => Promise<void>;
  onDelete?: (accountId: string) => Promise<void>;
}

const accountTypes = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'cd', label: 'CD (Certificate of Deposit)' },
  { value: 'hsa', label: 'HSA (Health Savings Account)' },
];

export function CashAccountModal({ open, userId, account, onClose, onSave, onDelete }: Props) {
  const isEditMode = !!account;

  const [formData, setFormData] = useState({
    institution: account?.institution || '',
    nickname: account?.nickname || '',
    accountType: account?.accountType || 'checking',
    accountNumber: account?.accountNumber || '',
    routingNumber: account?.routingNumber || '',
    balance: account?.balance || 0,
    interestRateApr: account?.interestRateApr || 0,
    purpose: account?.purpose || '',
    isEmergencyFund: account?.isEmergencyFund || false,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update form when account prop changes
  useEffect(() => {
    if (account) {
      setFormData({
        institution: account.institution,
        nickname: account.nickname || '',
        accountType: account.accountType,
        accountNumber: account.accountNumber || '',
        routingNumber: account.routingNumber || '',
        balance: account.balance,
        interestRateApr: account.interestRateApr || 0,
        purpose: account.purpose || '',
        isEmergencyFund: account.isEmergencyFund,
      });
    }
  }, [account]);

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }

    if (!formData.accountType) {
      newErrors.accountType = 'Account type is required';
    }

    if (formData.balance < 0) {
      newErrors.balance = 'Balance cannot be negative';
    }

    if (formData.interestRateApr < 0 || formData.interestRateApr > 100) {
      newErrors.interestRateApr = 'Interest rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (isEditMode) {
        // Edit mode: send UpdateCashAccountRequest
        const updateRequest: UpdateCashAccountRequest = {
          nickname: formData.nickname.trim() || undefined,
          institution: formData.institution.trim(),
          accountNumber: formData.accountNumber.trim() || undefined,
          routingNumber: formData.routingNumber.trim() || undefined,
          balance: formData.balance,
          interestRateApr: formData.interestRateApr || undefined,
          purpose: formData.purpose.trim() || undefined,
        };
        await onSave(updateRequest, account!.cashAccountId);
      } else {
        // Create mode: send CreateCashAccountRequest
        const createRequest: CreateCashAccountRequest = {
          userId,
          institution: formData.institution.trim(),
          nickname: formData.nickname.trim() || undefined,
          accountType: formData.accountType,
          balance: formData.balance,
          interestRateApr: formData.interestRateApr || undefined,
          purpose: formData.purpose.trim() || undefined,
          isEmergencyFund: formData.isEmergencyFund,
        };
        await onSave(createRequest);
      }

      // Reset form on success
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to save cash account:', error);
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save account. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      institution: '',
      nickname: '',
      accountType: 'checking',
      accountNumber: '',
      routingNumber: '',
      balance: 0,
      interestRateApr: 0,
      purpose: '',
      isEmergencyFund: false,
    });
    setErrors({});
    setSaveError(null);
  };

  const handleDelete = async () => {
    if (!isEditMode || !account || !onDelete) return;

    setDeleting(true);
    setSaveError(null);

    try {
      await onDelete(account.cashAccountId);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to delete cash account:', error);
      setSaveError(
        error instanceof Error ? error.message : 'Failed to delete account. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Cash Account' : 'Add Cash Account'}
        {isEditMode && onDelete && account && (
          <IconButton
            onClick={handleDelete}
            disabled={saving || deleting}
            color="error"
            aria-label="Delete account"
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <TextField
            label="Institution"
            value={formData.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            error={!!errors.institution}
            helperText={errors.institution || 'e.g., "Chase", "Navy Federal", "Ally Bank"'}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Nickname (Optional)"
            value={formData.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            helperText='e.g., "Primary Checking", "Emergency Fund"'
            fullWidth
            disabled={saving}
          />

          <TextField
            select
            label="Account Type"
            value={formData.accountType}
            onChange={(e) => handleChange('accountType', e.target.value)}
            error={!!errors.accountType}
            helperText={errors.accountType}
            required
            fullWidth
            disabled={saving}
          >
            {accountTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Account Number (Optional)"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            helperText="Last 4 digits or full account number"
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Routing Number (Optional)"
            value={formData.routingNumber}
            onChange={(e) => handleChange('routingNumber', e.target.value)}
            helperText="9-digit bank routing number"
            fullWidth
            disabled={saving}
            inputProps={{ maxLength: 9 }}
          />

          <TextField
            label="Current Balance"
            type="number"
            value={formData.balance}
            onChange={(e) => handleChange('balance', parseFloat(e.target.value) || 0)}
            error={!!errors.balance}
            helperText={errors.balance}
            required
            fullWidth
            disabled={saving}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="Interest Rate (APR %)"
            type="number"
            value={formData.interestRateApr}
            onChange={(e) => handleChange('interestRateApr', parseFloat(e.target.value) || 0)}
            error={!!errors.interestRateApr}
            helperText={errors.interestRateApr || 'Annual percentage rate (e.g., 4.5 for 4.5%)'}
            fullWidth
            disabled={saving}
            inputProps={{ min: 0, max: 100, step: 0.01 }}
          />

          <TextField
            label="Purpose (Optional)"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            helperText='e.g., "Emergency fund", "Down payment savings", "Monthly expenses"'
            fullWidth
            disabled={saving}
            multiline
            rows={2}
          />

          {!isEditMode && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isEmergencyFund}
                  onChange={(e) => handleChange('isEmergencyFund', e.target.checked)}
                  disabled={saving}
                />
              }
              label="This is my emergency fund"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving || deleting}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || deleting}>
          {saving ? 'Saving...' : isEditMode ? 'Update Account' : 'Create Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
