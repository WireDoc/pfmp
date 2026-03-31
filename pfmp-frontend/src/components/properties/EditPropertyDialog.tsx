/**
 * Edit Property Dialog
 * Wave 15 — Edit existing property with address validation.
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
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  updateProperty,
  validateAddress,
  type PropertyDetailDto,
  type UpdatePropertyRequest,
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

interface EditPropertyDialogProps {
  open: boolean;
  onClose: () => void;
  property: PropertyDetailDto;
  onUpdated: () => void;
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
  interestRate: string;
  mortgageTerm: string;
  lienholder: string;
  monthlyPropertyTax: string;
  monthlyInsurance: string;
  purpose: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export default function EditPropertyDialog({ open, onClose, property, onUpdated }: EditPropertyDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    propertyName: '',
    propertyType: 'primary',
    occupancy: 'owner',
    estimatedValue: '',
    mortgageBalance: '',
    monthlyMortgagePayment: '',
    monthlyRentalIncome: '',
    monthlyExpenses: '',
    hasHeloc: false,
    interestRate: '',
    mortgageTerm: '',
    lienholder: '',
    monthlyPropertyTax: '',
    monthlyInsurance: '',
    purpose: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [addressValidation, setAddressValidation] = useState<AddressValidationResponse | null>(null);

  useEffect(() => {
    if (open && property) {
      setFormData({
        propertyName: property.propertyName || '',
        propertyType: property.propertyType || 'primary',
        occupancy: property.occupancy || 'owner',
        estimatedValue: property.estimatedValue?.toString() || '',
        mortgageBalance: property.mortgageBalance?.toString() || '',
        monthlyMortgagePayment: property.monthlyMortgagePayment?.toString() || '',
        monthlyRentalIncome: property.monthlyRentalIncome?.toString() || '',
        monthlyExpenses: property.monthlyExpenses?.toString() || '',
        hasHeloc: property.hasHeloc || false,
        interestRate: property.interestRate?.toString() || '',
        mortgageTerm: property.mortgageTerm?.toString() || '',
        lienholder: property.lienholder || '',
        monthlyPropertyTax: property.monthlyPropertyTax?.toString() || '',
        monthlyInsurance: property.monthlyInsurance?.toString() || '',
        purpose: property.purpose || '',
        street: property.street || '',
        city: property.city || '',
        state: property.state || '',
        postalCode: property.postalCode || '',
      });
      setErrors({});
      setSaveError(null);
      setAddressValidation(property.addressValidated ? { isValid: true, street: property.street || '', city: property.city || '', state: property.state || '', zip: property.postalCode || '', zip4: null, message: null } : null);
    }
  }, [open, property]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      const request: UpdatePropertyRequest = {
        propertyName: formData.propertyName.trim(),
        propertyType: formData.propertyType,
        occupancy: formData.occupancy,
        estimatedValue: parseFloat(formData.estimatedValue),
        mortgageBalance: formData.mortgageBalance ? parseFloat(formData.mortgageBalance) : undefined,
        monthlyMortgagePayment: formData.monthlyMortgagePayment ? parseFloat(formData.monthlyMortgagePayment) : undefined,
        monthlyRentalIncome: formData.monthlyRentalIncome ? parseFloat(formData.monthlyRentalIncome) : undefined,
        monthlyExpenses: formData.monthlyExpenses ? parseFloat(formData.monthlyExpenses) : undefined,
        hasHeloc: formData.hasHeloc,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        mortgageTerm: formData.mortgageTerm ? parseInt(formData.mortgageTerm, 10) : undefined,
        lienholder: formData.lienholder.trim() || undefined,
        monthlyPropertyTax: formData.monthlyPropertyTax ? parseFloat(formData.monthlyPropertyTax) : undefined,
        monthlyInsurance: formData.monthlyInsurance ? parseFloat(formData.monthlyInsurance) : undefined,
        purpose: formData.purpose.trim() || undefined,
        street: formData.street.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
      };

      await updateProperty(property.propertyId, request);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      setSaveError(typeof msg === 'string' ? msg : 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  const isPlaidMortage = property.isPlaidLinked;
  const hasAddress = formData.street && formData.city && formData.state && formData.postalCode;

  return (
    <Dialog open={open} onClose={(_event, reason) => { if (reason !== 'backdropClick') handleClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Property</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          {isPlaidMortage && (
            <Alert severity="info">
              This property is linked via Plaid mortgage. Mortgage balance syncs automatically.
            </Alert>
          )}

          <TextField
            label="Property Name"
            value={formData.propertyName}
            onChange={(e) => handleChange('propertyName', e.target.value)}
            error={!!errors.propertyName}
            helperText={errors.propertyName}
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
            helperText={errors.estimatedValue}
            required
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 1000 } }}
          />

          <TextField
            label="Mortgage Balance"
            type="number"
            value={formData.mortgageBalance}
            onChange={(e) => handleChange('mortgageBalance', e.target.value)}
            fullWidth
            disabled={saving || isPlaidMortage}
            helperText={isPlaidMortage ? 'Synced via Plaid — edit disabled' : undefined}
            slotProps={{ htmlInput: { min: 0, step: 100 } }}
          />

          <TextField
            label="Monthly Mortgage Payment"
            type="number"
            value={formData.monthlyMortgagePayment}
            onChange={(e) => handleChange('monthlyMortgagePayment', e.target.value)}
            fullWidth
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 10 } }}
          />

          {(formData.propertyType === 'rental' || formData.propertyType === 'investment') && (
            <TextField
              label="Monthly Rental Income"
              type="number"
              value={formData.monthlyRentalIncome}
              onChange={(e) => handleChange('monthlyRentalIncome', e.target.value)}
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, step: 10 } }}
            />
          )}

          <TextField
            label="Monthly Expenses"
            type="number"
            value={formData.monthlyExpenses}
            onChange={(e) => handleChange('monthlyExpenses', e.target.value)}
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

          {/* Mortgage Details Section */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Mortgage Details (optional)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Interest Rate (%)"
              type="number"
              value={formData.interestRate}
              onChange={(e) => handleChange('interestRate', e.target.value)}
              helperText="Mortgage APR"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, max: 25, step: 0.125 } }}
            />
            <TextField
              label="Loan Term (years)"
              type="number"
              value={formData.mortgageTerm}
              onChange={(e) => handleChange('mortgageTerm', e.target.value)}
              helperText="e.g., 15, 20, 30"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
            />
          </Box>

          <TextField
            label="Lienholder / Lender"
            value={formData.lienholder}
            onChange={(e) => handleChange('lienholder', e.target.value)}
            helperText="e.g., Wells Fargo, Rocket Mortgage"
            fullWidth
            disabled={saving}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Monthly Property Tax"
              type="number"
              value={formData.monthlyPropertyTax}
              onChange={(e) => handleChange('monthlyPropertyTax', e.target.value)}
              helperText="Monthly tax amount"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, step: 10 } }}
            />
            <TextField
              label="Monthly Insurance"
              type="number"
              value={formData.monthlyInsurance}
              onChange={(e) => handleChange('monthlyInsurance', e.target.value)}
              helperText="Homeowner's insurance"
              fullWidth
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, step: 10 } }}
            />
          </Box>

          <TextField
            label="Purpose / Notes"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            helperText="Strategy notes visible to AI advisor (e.g., 'Plan to refinance in 2025')"
            fullWidth
            multiline
            rows={2}
            disabled={saving}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Property Address (required for automatic valuation)
          </Typography>

          <TextField
            label="Street Address"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
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
                  label={addressValidation.wasStandardized ? 'Address validated' : 'Address saved (validation unavailable)'}
                  color={addressValidation.wasStandardized ? 'success' : 'default'}
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
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
