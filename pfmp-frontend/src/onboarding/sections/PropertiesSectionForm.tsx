import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
  fetchPropertiesProfile,
  upsertPropertiesProfile,
  type FinancialProfileSectionStatusValue,
  type PropertiesProfilePayload,
  type PropertyPayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type PropertiesSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type PropertyFormState = {
  id: string;
  propertyName: string;
  propertyType: string;
  occupancy: string;
  estimatedValue: string;
  mortgageBalance: string;
  monthlyMortgagePayment: string;
  monthlyRentalIncome: string;
  monthlyExpenses: string;
  hasHeloc: boolean;
};

const PROPERTY_TYPE_OPTIONS = [
  { value: 'primary', label: 'Primary residence' },
  { value: 'vacation', label: 'Vacation home' },
  { value: 'rental', label: 'Rental property' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
];

const OCCUPANCY_OPTIONS = [
  { value: 'owner', label: 'Owner occupied' },
  { value: 'rental', label: 'Tenant occupied' },
  { value: 'vacant', label: 'Vacant' },
];

const DEFAULT_PROPERTY: PropertyFormState = {
  id: 'property-1',
  propertyName: '',
  propertyType: 'primary',
  occupancy: 'owner',
  estimatedValue: '',
  mortgageBalance: '',
  monthlyMortgagePayment: '',
  monthlyRentalIncome: '',
  monthlyExpenses: '',
  hasHeloc: false,
};

function createProperty(index: number): PropertyFormState {
  return { ...DEFAULT_PROPERTY, id: `property-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadProperties(properties: PropertyFormState[]): PropertyPayload[] {
  const payloads: PropertyPayload[] = [];

  properties.forEach((property) => {
    const hasValues =
      property.propertyName.trim() !== '' ||
      property.estimatedValue.trim() !== '' ||
      property.mortgageBalance.trim() !== '' ||
      property.monthlyMortgagePayment.trim() !== '' ||
      property.monthlyRentalIncome.trim() !== '';

    if (!hasValues) {
      return;
    }

    payloads.push({
      propertyName: property.propertyName.trim() || null,
      propertyType: property.propertyType || 'primary',
      occupancy: property.occupancy || 'owner',
      estimatedValue: parseNumber(property.estimatedValue) ?? null,
      mortgageBalance: parseNumber(property.mortgageBalance) ?? null,
      monthlyMortgagePayment: parseNumber(property.monthlyMortgagePayment) ?? null,
      monthlyRentalIncome: parseNumber(property.monthlyRentalIncome) ?? null,
      monthlyExpenses: parseNumber(property.monthlyExpenses) ?? null,
      hasHeloc: property.hasHeloc,
    });
  });

  return payloads;
}

export default function PropertiesSectionForm({ userId, onStatusChange, currentStatus }: PropertiesSectionFormProps) {
  const [properties, setProperties] = useState<PropertyFormState[]>([createProperty(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payloadProperties = useMemo(() => buildPayloadProperties(properties), [properties]);
  const canRemoveProperties = properties.length > 1;

  type HydratedState = {
    properties: PropertyFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const hasPropertyContent = useCallback((items: PropertyFormState[]) => {
    return items.some((property) =>
      property.propertyName.trim() !== '' ||
      property.estimatedValue.trim() !== '' ||
      property.mortgageBalance.trim() !== '' ||
      property.monthlyMortgagePayment.trim() !== '' ||
      property.monthlyRentalIncome.trim() !== '' ||
      property.monthlyExpenses.trim() !== '' ||
      property.hasHeloc,
    );
  }, []);

  const mapPayloadToState = useCallback((payload: PropertiesProfilePayload): HydratedState => {
    const hydratedProperties = (payload.properties ?? []).map((property, index) => ({
      id: `property-${index + 1}`,
      propertyName: property.propertyName ?? '',
      propertyType: property.propertyType ?? 'primary',
      occupancy: property.occupancy ?? 'owner',
      estimatedValue: property.estimatedValue != null ? String(property.estimatedValue) : '',
      mortgageBalance: property.mortgageBalance != null ? String(property.mortgageBalance) : '',
      monthlyMortgagePayment: property.monthlyMortgagePayment != null ? String(property.monthlyMortgagePayment) : '',
      monthlyRentalIncome: property.monthlyRentalIncome != null ? String(property.monthlyRentalIncome) : '',
      monthlyExpenses: property.monthlyExpenses != null ? String(property.monthlyExpenses) : '',
      hasHeloc: property.hasHeloc ?? false,
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      properties: hydratedProperties.length > 0 ? hydratedProperties : [createProperty(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ properties: nextProperties, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      const hasMeaningfulData =
        nextOptedOut || (nextReason?.trim()?.length ?? 0) > 0 || hasPropertyContent(nextProperties);

      if (!hasMeaningfulData) {
        return { properties, optedOut, optOutReason };
      }

      setProperties(nextProperties);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');

      return {
        properties: nextProperties,
        optedOut: nextOptedOut,
        optOutReason: nextReason ?? '',
      };
    },
    [hasPropertyContent, optOutReason, optedOut, properties],
  );

  useSectionHydration({
    sectionKey: 'real-estate',
    userId,
    fetcher: fetchPropertiesProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handlePropertyChange = <K extends keyof PropertyFormState>(id: string, key: K, value: PropertyFormState[K]) => {
    setProperties((prev) => prev.map((property) => (property.id === id ? { ...property, [key]: value } : property)));
  };

  const handleAddProperty = () => {
    setProperties((prev) => [...prev, createProperty(prev.length + 1)]);
  };

  const handleRemoveProperty = (id: string) => {
    setProperties((prev) => {
      const remaining = prev.filter((property) => property.id !== id);
      return remaining.length > 0 ? remaining : [createProperty(1)];
    });
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadProperties.length === 0) {
        throw new Error('Add at least one property or opt out of this section.');
      }

      const payload: PropertiesProfilePayload = optedOut
        ? {
            properties: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            properties: payloadProperties,
            optOut: undefined,
          };

      await upsertPropertiesProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save properties section', error);
      const message = error instanceof Error ? error.message : 'We could not save this section. Please try again.';
      setErrorMessage(message);
      setSaveState('error');
    }
  };

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (checked) {
      setSaveState('idle');
    }
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I don’t have real estate assets"
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
            {properties.map((property, index) => (
              <Box
                key={property.id}
                sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#f9fbff', position: 'relative' }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Property name"
                        placeholder="e.g. Primary residence"
                        value={property.propertyName}
                        onChange={(event) => handlePropertyChange(property.id, 'propertyName', event.target.value)}
                        fullWidth
                      />
                      <FormControl fullWidth>
                        <InputLabel id={`${property.id}-type-label`}>Property type</InputLabel>
                        <Select
                          labelId={`${property.id}-type-label`}
                          label="Property type"
                          value={property.propertyType}
                          onChange={(event) => handlePropertyChange(property.id, 'propertyType', event.target.value)}
                        >
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel id={`${property.id}-occupancy-label`}>Occupancy</InputLabel>
                        <Select
                          labelId={`${property.id}-occupancy-label`}
                          label="Occupancy"
                          value={property.occupancy}
                          onChange={(event) => handlePropertyChange(property.id, 'occupancy', event.target.value)}
                        >
                          {OCCUPANCY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        type="number"
                        label="Estimated value ($)"
                        value={property.estimatedValue}
                        onChange={(event) => handlePropertyChange(property.id, 'estimatedValue', event.target.value)}
                        inputProps={{ min: 0, step: 1000 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Mortgage balance ($)"
                        value={property.mortgageBalance}
                        onChange={(event) => handlePropertyChange(property.id, 'mortgageBalance', event.target.value)}
                        inputProps={{ min: 0, step: 1000 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Monthly mortgage payment ($)"
                        value={property.monthlyMortgagePayment}
                        onChange={(event) => handlePropertyChange(property.id, 'monthlyMortgagePayment', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Monthly rental income ($)"
                        value={property.monthlyRentalIncome}
                        onChange={(event) => handlePropertyChange(property.id, 'monthlyRentalIncome', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Monthly expenses ($)"
                        value={property.monthlyExpenses}
                        onChange={(event) => handlePropertyChange(property.id, 'monthlyExpenses', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                    </Stack>

                    <FormControlLabel
                      sx={{ mt: 2 }}
                      control={
                        <Checkbox
                          checked={property.hasHeloc}
                          onChange={(event) => handlePropertyChange(property.id, 'hasHeloc', event.target.checked)}
                        />
                      }
                      label="HELOC attached"
                    />
                  </Box>
                  {canRemoveProperties && (
                    <Tooltip title="Remove property">
                      <IconButton onClick={() => handleRemoveProperty(property.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Property {index + 1}
                </Typography>
              </Box>
            ))}

            <Button
              type="button"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddProperty}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add another property
            </Button>
          </Stack>
        )}

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {saveState === 'success' && <Alert severity="success">Section saved.</Alert>}

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleSubmit()}
            disabled={saveState === 'saving'}
            data-testid="properties-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Track equity, leverage, and cash flow from your properties here.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
