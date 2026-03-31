/**
 * Add Property Dialog
 * Wave 15 — Dashboard property creation with address validation.
 */

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
  FormControlLabel,
  Checkbox,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  createProperty,
  validateAddress,
  type CreatePropertyRequest,
  type AddressValidationResponse,
} from '../../api/properties';

const propertyTypes = [
  { value: 'primary', label: 'Primary Residence' },
  { value: 'rental', label: 'Rental Property' },
  { value: 'vacation', label: 'Vacation Home' },
  { value: 'investment', label: 'Investment Property' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Vacant Land' },
];

const occupancyTypes = [
  { value: 'owner', label: 'Owner-Occupied' },
  { value: 'tenant', label: 'Tenant-Occupied' },
  { value: 'vacant', label: 'Vacant' },
];

interface AddPropertyDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  onCreated: () => void;
}

interface FormData {
  propertyName: string;
  propertyType: string;
  occupancy: string;
  estimatedValue: string;
  mortgageBalance: string;
  monthlyMortgagePayment: string;
  monthlyRentalIncome: string;
  monthlyExpenses: string;
  hasHeloc: boolean;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

const initialForm: FormData = {
  propertyName: '',
  propertyType: 'primary',
  occupancy: 'owner',
  estimatedValue: '',
  mortgageBalance: '',
  monthlyMortgagePayment: '',
  monthlyRentalIncome: '',
  monthlyExpenses: '',
  hasHeloc: false,
  street: '',
  city: '',
  state: '',
  postalCode: '',
};

export default function AddPropertyDialog({ open, onClose, userId, onCreated }: AddPropertyDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [addressValidation, setAddressValidation] = useState<AddressValidationResponse | null>(null);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    // Clear address validation if address fields change
    if (['street', 'city', 'state', 'postalCode'].includes(field)) {
      setAddressValidation(null);
    }
  };

  const handleValidateAddress = async () => {
    if (!formData.street || !formData.city || !formData.state || !formData.postalCode) return;

    setValidating(true);
    try {
      const result = await validateAddress({
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.postalCode,
      });
      setAddressValidation(result);

      // Auto-fill standardized address
      if (result.isValid) {
        setFormData((prev) => ({
          ...prev,
          street: result.street || prev.street,
          city: result.city || prev.city,
          state: result.state || prev.state,
          postalCode: result.zip || prev.postalCode,
        }));
      }
    } catch {
      // Allow manual entry on validation failure
      setAddressValidation({ isValid: true, street: formData.street, city: formData.city, state: formData.state, zip: formData.postalCode, zip4: null, message: 'Validation service unavailable' });
    } finally {
      setValidating(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.propertyName.trim()) newErrors.propertyName = 'Property name is required';
    if (!formData.estimatedValue || parseFloat(formData.estimatedValue) <= 0)
      newErrors.estimatedValue = 'Enter a valid estimated value';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);
    try {
      const request: CreatePropertyRequest = {
        userId,
        propertyName: formData.propertyName.trim(),
        propertyType: formData.propertyType,
        occupancy: formData.occupancy,
        estimatedValue: parseFloat(formData.estimatedValue),
        mortgageBalance: formData.mortgageBalance ? parseFloat(formData.mortgageBalance) : undefined,
        monthlyMortgagePayment: formData.monthlyMortgagePayment ? parseFloat(formData.monthlyMortgagePayment) : undefined,
        monthlyRentalIncome: formData.monthlyRentalIncome ? parseFloat(formData.monthlyRentalIncome) : undefined,
        monthlyExpenses: formData.monthlyExpenses ? parseFloat(formData.monthlyExpenses) : undefined,
        hasHeloc: formData.hasHeloc,
        street: formData.street.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
      };

      await createProperty(request);
      setFormData(initialForm);
      setAddressValidation(null);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      setSaveError(typeof msg === 'string' ? msg : 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setFormData(initialForm);
      setErrors({});
      setSaveError(null);
      setAddressValidation(null);
      onClose();
    }
  };

  const hasAddress = formData.street && formData.city && formData.state && formData.postalCode;

  return (
    <Dialog open={open} onClose={(_event, reason) => { if (reason !== 'backdropClick') handleClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Add Property</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <TextField
            label="Property Name"
            value={formData.propertyName}
            onChange={(e) => handleChange('propertyName', e.target.value)}
            error={!!errors.propertyName}
            helperText={errors.propertyName || 'e.g., "123 Oak Street", "Lake House"'}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            select
            label="Property Type"
            value={formData.propertyType}
            onChange={(e) => handleChange('propertyType', e.target.value)}
            fullWidth
            disabled={saving}
          >
            {propertyTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Occupancy"
            value={formData.occupancy}
            onChange={(e) => handleChange('occupancy', e.target.value)}
            fullWidth
            disabled={saving}
          >
            {occupancyTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Estimated Value"
            type="number"
            value={formData.estimatedValue}
            onChange={(e) => handleChange('estimatedValue', e.target.value)}
            error={!!errors.estimatedValue}
            helperText={errors.estimatedValue || 'Current market value estimate'}
            required
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 1000 } }}
          />

          <TextField
            label="Mortgage Balance (Optional)"
            type="number"
            value={formData.mortgageBalance}
            onChange={(e) => handleChange('mortgageBalance', e.target.value)}
            helperText="Outstanding mortgage balance"
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 100 } }}
          />

          <TextField
            label="Monthly Mortgage Payment (Optional)"
            type="number"
            value={formData.monthlyMortgagePayment}
            onChange={(e) => handleChange('monthlyMortgagePayment', e.target.value)}
            helperText="Monthly principal + interest payment"
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 10 } }}
          />

          {(formData.propertyType === 'rental' || formData.propertyType === 'investment') && (
            <TextField
              label="Monthly Rental Income (Optional)"
              type="number"
              value={formData.monthlyRentalIncome}
              onChange={(e) => handleChange('monthlyRentalIncome', e.target.value)}
              helperText="Gross monthly rental income"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, step: 10 } }}
            />
          )}

          <TextField
            label="Monthly Expenses (Optional)"
            type="number"
            value={formData.monthlyExpenses}
            onChange={(e) => handleChange('monthlyExpenses', e.target.value)}
            helperText="Insurance, taxes, HOA, maintenance, etc."
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 10 } }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.hasHeloc}
                onChange={(e) => handleChange('hasHeloc', e.target.checked)}
                disabled={saving}
              />
            }
            label="Has HELOC (Home Equity Line of Credit)"
          />

          {/* Address Section */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Property Address (optional — required for automatic valuation)
          </Typography>

          <TextField
            label="Street Address"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
            helperText="e.g., 123 Oak Street"
            fullWidth
            disabled={saving}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="City"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 2 } }}
              sx={{ width: 100 }}
            />
            <TextField
              label="ZIP"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 10 } }}
              sx={{ width: 120 }}
            />
          </Box>

          {hasAddress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleValidateAddress}
                disabled={validating || saving}
                startIcon={validating ? <CircularProgress size={16} /> : undefined}
              >
                {validating ? 'Validating...' : 'Validate Address'}
              </Button>
              {addressValidation?.isValid && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Address validated"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
              {addressValidation && !addressValidation.isValid && (
                <Typography variant="caption" color="warning.main">
                  {addressValidation.message || 'Address not found — manual entry accepted'}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Creating...' : 'Create Property'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
