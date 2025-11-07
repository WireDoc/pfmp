import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface Props {
  open: boolean;
  account: AccountSnapshot | null;
  onClose: () => void;
  onSave: (account: AccountUpdateData) => Promise<void>;
}

export interface AccountUpdateData {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  accountNumber?: string;
  purpose?: string;
}

const accountTypes = [
  'Checking',
  'Savings',
  'Credit Card',
  'Investment',
  'IRA',
  '401k',
  'TSP',
  'Brokerage',
  'Real Estate',
  'Other',
];

/**
 * AccountDetailModal - Edit existing account details
 * 
 * Allows users to update account information from the dashboard
 * without returning to onboarding flow.
 */
export function AccountDetailModal({ open, account, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<AccountUpdateData>({
    id: account?.id || '',
    name: account?.name || '',
    institution: account?.institution || '',
    type: account?.type || 'Checking',
    balance: account?.balance.amount || 0,
    accountNumber: '',
    purpose: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when account prop changes
  React.useEffect(() => {
    if (account) {
      setFormData({
        id: account.id,
        name: account.name,
        institution: account.institution,
        type: account.type || 'Checking', // Fallback to Checking if type is missing
        balance: account.balance.amount,
        accountNumber: '',
        purpose: '',
      });
    }
  }, [account]);

  const handleChange = (field: keyof AccountUpdateData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'balance' ? parseFloat(event.target.value) || 0 : event.target.value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }
    if (!formData.institution.trim()) {
      setError('Institution is required');
      return;
    }
    if (formData.balance < 0) {
      setError('Balance cannot be negative');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      onClose();
    }
  };

  if (!account) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Edit Account</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <TextField
            label="Account Name"
            value={formData.name}
            onChange={handleChange('name')}
            required
            fullWidth
            helperText="A friendly name for this account (e.g., 'Main Checking', 'Emergency Fund')"
          />

          <TextField
            label="Institution"
            value={formData.institution}
            onChange={handleChange('institution')}
            required
            fullWidth
            helperText="Bank or brokerage name (e.g., 'Chase', 'Vanguard')"
          />

          <TextField
            select
            label="Account Type"
            value={formData.type}
            onChange={handleChange('type')}
            required
            fullWidth
          >
            {accountTypes.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Purpose (optional)"
            value={formData.purpose}
            onChange={handleChange('purpose')}
            fullWidth
            multiline
            rows={2}
            helperText='e.g., "Emergency Fund", "Down Payment Savings"'
          />

          <TextField
            label="Current Balance"
            type="number"
            value={formData.balance}
            onChange={handleChange('balance')}
            required
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            inputProps={{
              step: 0.01,
              min: 0,
            }}
          />

          <TextField
            label="Account Number (optional)"
            value={formData.accountNumber}
            onChange={handleChange('accountNumber')}
            fullWidth
            placeholder="Last 4 digits"
            helperText="For your reference only. Not used for connectivity."
          />

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            p: 1.5,
            bgcolor: 'info.50',
            borderRadius: 1,
            border: 1,
            borderColor: 'info.200',
          }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Last synced:</strong> {new Date(account.lastSync).toLocaleString()}
              <br />
              <strong>Sync status:</strong> {account.syncStatus}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
