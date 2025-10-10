import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  type FinancialProfileSectionStatusValue,
  type RiskGoalsProfilePayload,
  upsertRiskGoalsProfile,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type RiskGoalsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

const RISK_TOLERANCE_OPTIONS = [
  { value: 1, label: '1 · Very conservative' },
  { value: 2, label: '2 · Conservative' },
  { value: 3, label: '3 · Balanced' },
  { value: 4, label: '4 · Growth' },
  { value: 5, label: '5 · Aggressive' },
];

export default function RiskGoalsSectionForm({ userId, onStatusChange, currentStatus }: RiskGoalsSectionFormProps) {
  const [formState, setFormState] = useState<RiskGoalsProfilePayload>(
    currentStatus === 'opted_out'
      ? {
          optOut: {
            isOptedOut: true,
            reason: '',
            acknowledgedAt: new Date().toISOString(),
          },
        }
      : {
          riskTolerance: undefined,
          targetRetirementDate: undefined,
          passiveIncomeGoal: undefined,
          liquidityBufferMonths: undefined,
          emergencyFundTarget: undefined,
          optOut: undefined,
        },
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const optedOut = formState.optOut?.isOptedOut === true;

  const setField = <K extends keyof RiskGoalsProfilePayload>(key: K, value: RiskGoalsProfilePayload[K]) => {
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
      const payload: RiskGoalsProfilePayload = optedOut
        ? {
            optOut: formState.optOut,
          }
        : {
            riskTolerance: formState.riskTolerance ?? undefined,
            targetRetirementDate: formState.targetRetirementDate
              ? new Date(formState.targetRetirementDate).toISOString()
              : undefined,
            passiveIncomeGoal: formState.passiveIncomeGoal ?? undefined,
            liquidityBufferMonths: formState.liquidityBufferMonths ?? undefined,
            emergencyFundTarget: formState.emergencyFundTarget ?? undefined,
            optOut: undefined,
          };

      await upsertRiskGoalsProfile(userId, payload);

      const nextStatus: FinancialProfileSectionStatusValue = optedOut ? 'opted_out' : 'completed';
      onStatusChange(nextStatus);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save risk goals profile', error);
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
                optOut: {
                  ...prev.optOut,
                  isOptedOut: true,
                  reason: event.target.value,
                  acknowledgedAt: prev.optOut?.acknowledgedAt ?? new Date().toISOString(),
                },
              }))
            }
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={2.5}>
            <TextField
              select
              label="Risk tolerance"
              value={formState.riskTolerance ?? ''}
              onChange={(event) =>
                setField('riskTolerance', event.target.value === '' ? undefined : Number(event.target.value))
              }
              helperText="How much market volatility can you tolerate?"
              fullWidth
            >
              <MenuItem value="">
                <em>Select level</em>
              </MenuItem>
              {RISK_TOLERANCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              label="Target retirement date"
              InputLabelProps={{ shrink: true }}
              value={formState.targetRetirementDate ?? ''}
              onChange={(event) => setField('targetRetirementDate', event.target.value || undefined)}
              fullWidth
            />

            <TextField
              type="number"
              label="Passive income goal (monthly)"
              value={formState.passiveIncomeGoal ?? ''}
              onChange={(event) =>
                setField('passiveIncomeGoal', event.target.value === '' ? undefined : Number(event.target.value))
              }
              inputProps={{ min: 0, step: 100 }}
              fullWidth
            />

            <TextField
              type="number"
              label="Liquidity buffer (months)"
              value={formState.liquidityBufferMonths ?? ''}
              onChange={(event) =>
                setField('liquidityBufferMonths', event.target.value === '' ? undefined : Number(event.target.value))
              }
              inputProps={{ min: 0, step: 0.5 }}
              helperText="How many months of expenses should stay liquid?"
              fullWidth
            />

            <TextField
              type="number"
              label="Emergency fund target ($)"
              value={formState.emergencyFundTarget ?? ''}
              onChange={(event) =>
                setField('emergencyFundTarget', event.target.value === '' ? undefined : Number(event.target.value))
              }
              inputProps={{ min: 0, step: 500 }}
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
            data-testid="risk-goals-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            These preferences steer your personalized recommendations.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
