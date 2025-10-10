import { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { upsertHouseholdProfile, type FinancialProfileSectionStatusValue, type HouseholdProfilePayload } from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type HouseholdSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'domestic-partner', label: 'Domestic Partner' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export function HouseholdSectionForm({ userId, onStatusChange, currentStatus }: HouseholdSectionFormProps) {
  const [formState, setFormState] = useState<HouseholdProfilePayload>({
    preferredName: '',
    maritalStatus: '',
    dependentCount: undefined,
    serviceNotes: '',
    optOut: currentStatus === 'opted_out'
      ? { isOptedOut: true, reason: '', acknowledgedAt: new Date().toISOString() }
      : undefined,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const optedOut = formState.optOut?.isOptedOut === true;

  const handleChange = <K extends keyof HouseholdProfilePayload>(key: K, value: HouseholdProfilePayload[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleOptOutToggle = (checked: boolean) => {
    if (checked) {
      setFormState((prev) => ({
        ...prev,
        optOut: {
          isOptedOut: true,
          reason: prev.optOut?.reason ?? '',
          acknowledgedAt: new Date().toISOString(),
        },
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        optOut: undefined,
      }));
    }
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);
    try {
      await upsertHouseholdProfile(userId, {
        ...formState,
        preferredName: optedOut ? undefined : formState.preferredName?.trim() || undefined,
        maritalStatus: optedOut ? undefined : formState.maritalStatus?.trim() || undefined,
        serviceNotes: optedOut ? undefined : formState.serviceNotes?.trim() || undefined,
        dependentCount: optedOut ? undefined : formState.dependentCount ?? undefined,
        optOut: optedOut ? formState.optOut : undefined,
      });
      const nextStatus: FinancialProfileSectionStatusValue = optedOut ? 'opted_out' : 'completed';
      onStatusChange(nextStatus);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save household profile', error);
      setErrorMessage('We could not save this section. Please try again.');
      setSaveState('error');
    }
  };

  return (
    <Box component="form" noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I want to skip this section for now"
        />

        {optedOut ? (
          <TextField
            label="Why are you opting out?"
            value={formState.optOut?.reason ?? ''}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                optOut: { ...prev.optOut, isOptedOut: true, reason: event.target.value },
              }))
            }
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={2.5}>
            <TextField
              label="Preferred name"
              placeholder="How should we address you?"
              value={formState.preferredName ?? ''}
              onChange={(event) => handleChange('preferredName', event.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Marital status"
              value={formState.maritalStatus ?? ''}
              onChange={(event) => handleChange('maritalStatus', event.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>Select status</em>
              </MenuItem>
              {MARITAL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              label="Dependents"
              inputProps={{ min: 0, max: 12 }}
              value={formState.dependentCount ?? ''}
              onChange={(event) => handleChange('dependentCount', event.target.value === '' ? undefined : Number(event.target.value))}
              fullWidth
            />

            <TextField
              label="Notes we'd share with your planner"
              value={formState.serviceNotes ?? ''}
              onChange={(event) => handleChange('serviceNotes', event.target.value)}
              placeholder="List household dynamics, caring responsibilities, or anything you want us to know."
              multiline
              minRows={4}
              fullWidth
            />
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
            data-testid="household-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            We’ll sync this instantly to your secure profile.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default HouseholdSectionForm;
