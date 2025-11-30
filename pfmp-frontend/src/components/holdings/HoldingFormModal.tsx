import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Grid from '@mui/material/Grid';
import type { Holding, CreateHoldingRequest, UpdateHoldingRequest } from '../../types/holdings';
import { AssetTypeEnum, AssetTypeLabels, AssetTypeNameToValue } from '../../types/holdings';

interface HoldingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  holding: Holding | null;
  accountId: number;
}

interface FormData {
  symbol: string;
  name: string;
  assetType: number;
  quantity: string;
  averageCostBasis: string;
  currentPrice: string;
  annualDividendYield: string;
  beta: string;
  sectorAllocation: string;
  notes: string;
  purchaseDate: Date | null;
}

const initialFormData: FormData = {
  symbol: '',
  name: '',
  assetType: AssetTypeEnum.Stock,
  quantity: '',
  averageCostBasis: '',
  currentPrice: '',
  annualDividendYield: '',
  beta: '',
  sectorAllocation: '',
  notes: '',
  purchaseDate: null,
};

export function HoldingFormModal({ open, onClose, onSave, holding, accountId }: HoldingFormModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (holding) {
      // Backend returns assetType as enum name string (e.g., "Cryptocurrency", "Stock")
      // Convert to numeric value for the form
      let assetTypeNum: number;
      if (typeof holding.assetType === 'string') {
        // Try reverse lookup first (enum name), fallback to parsing as number
        assetTypeNum = AssetTypeNameToValue[holding.assetType] ?? parseInt(holding.assetType, 10);
      } else {
        assetTypeNum = holding.assetType;
      }
      
      setFormData({
        symbol: holding.symbol,
        name: holding.name || '',
        assetType: !isNaN(assetTypeNum) ? assetTypeNum : AssetTypeEnum.Stock,
        quantity: holding.quantity.toString(),
        averageCostBasis: holding.averageCostBasis.toString(),
        currentPrice: holding.currentPrice.toString(),
        annualDividendYield: holding.annualDividendYield?.toString() || '',
        beta: holding.beta?.toString() || '',
        sectorAllocation: holding.sectorAllocation || '',
        notes: holding.notes || '',
        purchaseDate: holding.purchaseDate ? new Date(holding.purchaseDate) : null,
      });
    } else {
      setFormData(initialFormData);
    }
    setError(null);
  }, [holding, open]);

  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.symbol.trim()) {
      setError('Symbol is required');
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }
    if (!formData.averageCostBasis || parseFloat(formData.averageCostBasis) < 0) {
      setError('Average cost basis must be 0 or greater');
      return false;
    }
    if (!formData.currentPrice || parseFloat(formData.currentPrice) < 0) {
      setError('Current price must be 0 or greater');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = holding
        ? `http://localhost:5052/api/holdings/${holding.holdingId}`
        : 'http://localhost:5052/api/holdings';
      
      const method = holding ? 'PUT' : 'POST';

      const payload: CreateHoldingRequest | UpdateHoldingRequest = holding
        ? {
            symbol: formData.symbol,
            name: formData.name || undefined,
            assetType: formData.assetType,
            quantity: parseFloat(formData.quantity),
            averageCostBasis: parseFloat(formData.averageCostBasis),
            currentPrice: parseFloat(formData.currentPrice),
            annualDividendYield: formData.annualDividendYield ? parseFloat(formData.annualDividendYield) : undefined,
            beta: formData.beta ? parseFloat(formData.beta) : undefined,
            sectorAllocation: formData.sectorAllocation || undefined,
            notes: formData.notes || undefined,
            purchaseDate: formData.purchaseDate ? formData.purchaseDate.toISOString() : undefined,
          }
        : {
            accountId,
            symbol: formData.symbol,
            name: formData.name || undefined,
            assetType: formData.assetType,
            quantity: parseFloat(formData.quantity),
            averageCostBasis: parseFloat(formData.averageCostBasis),
            currentPrice: parseFloat(formData.currentPrice),
            annualDividendYield: formData.annualDividendYield ? parseFloat(formData.annualDividendYield) : undefined,
            beta: formData.beta ? parseFloat(formData.beta) : undefined,
            sectorAllocation: formData.sectorAllocation || undefined,
            notes: formData.notes || undefined,
            purchaseDate: formData.purchaseDate ? formData.purchaseDate.toISOString() : undefined,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to ${holding ? 'update' : 'create'} holding`);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const assetTypeOptions = Object.entries(AssetTypeEnum)
    .map(([key, value]) => ({
      value: value as number,
      label: AssetTypeLabels[value as number] || key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{holding ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Symbol"
                value={formData.symbol}
                onChange={handleChange('symbol')}
                fullWidth
              required
              disabled={loading}
              placeholder="e.g., AAPL"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleChange('name')}
              fullWidth
              disabled={loading}
              placeholder="e.g., Apple Inc."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Asset Type"
              value={formData.assetType}
              onChange={handleChange('assetType')}
              fullWidth
              required
              disabled={loading}
            >
              {assetTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange('quantity')}
              fullWidth
              required
              disabled={loading}
              inputProps={{ step: 'any', min: 0 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Average Cost Basis"
              type="number"
              value={formData.averageCostBasis}
              onChange={handleChange('averageCostBasis')}
              fullWidth
              required
              disabled={loading}
              inputProps={{ step: '0.01', min: 0 }}
              placeholder="0.00"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Current Price"
              type="number"
              value={formData.currentPrice}
              onChange={handleChange('currentPrice')}
              fullWidth
              required
              disabled={loading}
              inputProps={{ step: '0.01', min: 0 }}
              placeholder="0.00"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="Acquisition Date"
              value={formData.purchaseDate}
              onChange={(newValue) => setFormData(prev => ({ ...prev, purchaseDate: newValue }))}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'Date this holding was purchased',
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Annual Dividend Yield (%)"
              type="number"
              value={formData.annualDividendYield}
              onChange={handleChange('annualDividendYield')}
              fullWidth
              disabled={loading}
              inputProps={{ step: '0.01', min: 0 }}
              placeholder="0.00"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Beta"
              type="number"
              value={formData.beta}
              onChange={handleChange('beta')}
              fullWidth
              disabled={loading}
              inputProps={{ step: '0.01' }}
              placeholder="1.00"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Sector Allocation"
              value={formData.sectorAllocation}
              onChange={handleChange('sectorAllocation')}
              fullWidth
              disabled={loading}
              placeholder="e.g., Technology"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={handleChange('notes')}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Optional notes about this holding"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {holding ? 'Update' : 'Add'}
        </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
