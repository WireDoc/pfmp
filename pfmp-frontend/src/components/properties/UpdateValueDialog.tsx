/**
 * Update Value Dialog
 * Wave 15 — Quick manual value update from PropertyDetailView.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
} from '@mui/material';
import { updateProperty } from '../../api/properties';

interface UpdateValueDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  currentValue: number;
  onUpdated: () => void;
}

export default function UpdateValueDialog({ open, onClose, propertyId, currentValue, onUpdated }: UpdateValueDialogProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setValue(currentValue.toString());
    setError(null);
  };

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid value greater than 0');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProperty(propertyId, { estimatedValue: parsed });
      onUpdated();
      onClose();
    } catch {
      setError('Failed to update property value');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => { if (reason !== 'backdropClick' && !saving) onClose(); }}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>Update Property Value</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            label="Estimated Value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 1000 } }}
            helperText="Enter current market value estimate"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Updating...' : 'Update Value'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
