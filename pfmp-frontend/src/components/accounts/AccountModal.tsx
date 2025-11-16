/**
 * Account Modal - Edit Account Details
 * 
 * Modal for editing accounts from the unified Accounts table.
 * Used on the dashboard for quick account edits.
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
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { AccountResponse, UpdateAccountRequest } from '../../services/accountsApi';

interface Props {
  open: boolean;
  account: AccountResponse | null;
  onClose: () => void;
  onSave: (accountId: number, request: UpdateAccountRequest) => Promise<void>;
  onDelete?: (accountId: number) => Promise<void>;
}

const accountTypes = [
  // Investment Accounts
  { value: 'Brokerage', label: 'Brokerage' },
  { value: 'RetirementAccount401k', label: '401(k)' },
  { value: 'RetirementAccountIRA', label: 'Traditional IRA' },
  { value: 'RetirementAccountRoth', label: 'Roth IRA' },
  { value: 'TSP', label: 'TSP (Thrift Savings Plan)' },
  { value: 'HSA', label: 'HSA (Health Savings Account)' },
  
  // Cash Accounts
  { value: 'Checking', label: 'Checking' },
  { value: 'Savings', label: 'Savings' },
  { value: 'MoneyMarket', label: 'Money Market' },
  { value: 'CertificateOfDeposit', label: 'Certificate of Deposit' },
  
  // Crypto
  { value: 'CryptocurrencyExchange', label: 'Cryptocurrency Exchange' },
  { value: 'CryptocurrencyWallet', label: 'Cryptocurrency Wallet' },
  
  // Other
  { value: 'RealEstate', label: 'Real Estate' },
  { value: 'Business', label: 'Business' },
  { value: 'Other', label: 'Other' },
];

export function AccountModal({ open, account, onClose, onSave, onDelete }: Props) {
  const [formData, setFormData] = useState({
    name: account?.accountName || '',
    institution: account?.institution || '',
    type: account?.accountType || 'Checking',
    balance: account?.currentBalance || 0,
    accountNumber: account?.accountNumber || '',
    purpose: account?.purpose || '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update form when account prop changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.accountName,
        institution: account.institution,
        type: account.accountType,
        balance: account.currentBalance,
        accountNumber: account.accountNumber || '',
        purpose: account.purpose || '',
      });
    }
  }, [account]);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
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

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }

    if (!formData.type) {
      newErrors.type = 'Account type is required';
    }

    if (formData.balance < 0) {
      newErrors.balance = 'Balance cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !account) return;

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(account.accountId, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save account:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account || !onDelete) return;
    
    if (!confirm(`Are you sure you want to delete "${account.accountName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setSaveError(null);

    try {
      await onDelete(account.accountId);
      onClose();
    } catch (error) {
      console.error('Failed to delete account:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!saving && !deleting) {
      onClose();
      // Reset errors when closing
      setErrors({});
      setSaveError(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Account
        {onDelete && account && (
          <IconButton
            aria-label="delete"
            onClick={handleDelete}
            disabled={deleting || saving}
            color="error"
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Account Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'e.g., "Taxable Brokerage", "Roth IRA"'}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Institution"
            value={formData.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            error={!!errors.institution}
            helperText={errors.institution || 'e.g., "Vanguard", "Fidelity", "Charles Schwab"'}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            select
            label="Account Type"
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            error={!!errors.type}
            helperText={errors.type}
            required
            fullWidth
            disabled={saving}
          >
            {accountTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Balance"
            type="number"
            value={formData.balance}
            onChange={(e) => handleChange('balance', parseFloat(e.target.value) || 0)}
            error={!!errors.balance}
            helperText={errors.balance || 'Current account balance'}
            required
            fullWidth
            disabled={saving}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="Account Number (Optional)"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            helperText="Last 4 digits only (e.g., 1234)"
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Purpose (Optional)"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            helperText='e.g., "Retirement savings", "House down payment", "College fund"'
            fullWidth
            disabled={saving}
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving || deleting}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || deleting}
        >
          {saving ? 'Saving...' : 'Update Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
