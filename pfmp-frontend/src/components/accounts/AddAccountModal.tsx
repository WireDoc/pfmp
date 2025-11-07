import { useState } from 'react';
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
} from '@mui/material';

interface Props {
  open: boolean;
  userId: number;
  onClose: () => void;
  onSave: (account: NewAccountData) => Promise<void>;
}

export interface NewAccountData {
  userId: number;
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
 * AddAccountModal - Create new manual account
 * 
 * Allows users to add accounts directly from the dashboard
 * without going through the onboarding flow.
 */
export function AddAccountModal({ open, userId, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    type: 'Checking',
    balance: 0,
    accountNumber: '',
    purpose: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    if (!validate()) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave({
        userId,
        name: formData.name.trim(),
        institution: formData.institution.trim(),
        type: formData.type,
        balance: formData.balance,
        accountNumber: formData.accountNumber.trim() || undefined,
        purpose: formData.purpose.trim() || undefined,
      });

      // Reset form on success
      setFormData({
        name: '',
        institution: '',
        type: 'Checking',
        balance: 0,
        accountNumber: '',
        purpose: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create account:', error);
      setSaveError(
        error instanceof Error ? error.message : 'Failed to create account. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      // Reset form when closing
      setFormData({
        name: '',
        institution: '',
        type: 'Checking',
        balance: 0,
        accountNumber: '',
        purpose: '',
      });
      setErrors({});
      setSaveError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Account</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <TextField
            label="Account Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'e.g., "Primary Checking", "Emergency Fund"'}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Institution"
            value={formData.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            error={!!errors.institution}
            helperText={errors.institution || 'e.g., "Chase", "Navy Federal"'}
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
            {accountTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Purpose (Optional)"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            helperText='e.g., "Emergency Fund", "Down Payment Savings"'
            fullWidth
            disabled={saving}
            multiline
            rows={2}
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
            label="Account Number (Optional)"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            helperText="Last 4 digits for identification"
            fullWidth
            disabled={saving}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Creating...' : 'Create Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
