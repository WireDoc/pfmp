import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  upsertTaxProfile,
  type FinancialProfileSectionStatusValue,
  type TaxProfilePayload,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type TaxPostureSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_joint', label: 'Married filing jointly' },
  { value: 'married_separate', label: 'Married filing separately' },
  { value: 'head_of_household', label: 'Head of household' },
  { value: 'widow', label: 'Qualifying widow(er)' },
];

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TaxPostureSectionForm({ userId, onStatusChange, currentStatus }: TaxPostureSectionFormProps) {
  const [filingStatus, setFilingStatus] = useState('single');
  const [state, setState] = useState('');
  const [marginalRate, setMarginalRate] = useState('');
  const [effectiveRate, setEffectiveRate] = useState('');
  const [withholding, setWithholding] = useState('');
  const [expectedRefund, setExpectedRefund] = useState('');
  const [expectedPayment, setExpectedPayment] = useState('');
  const [usesCpa, setUsesCpa] = useState(false);
  const [notes, setNotes] = useState('');
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (checked) {
      setSaveState('idle');
    }
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      const payload: TaxProfilePayload = optedOut
        ? {
            filingStatus: filingStatus,
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            filingStatus,
            stateOfResidence: state.trim() || null,
            marginalRatePercent: parseNumber(marginalRate) ?? null,
            effectiveRatePercent: parseNumber(effectiveRate) ?? null,
            federalWithholdingPercent: parseNumber(withholding) ?? null,
            expectedRefundAmount: parseNumber(expectedRefund) ?? null,
            expectedPaymentAmount: parseNumber(expectedPayment) ?? null,
            usesCpaOrPreparer: usesCpa,
            notes: notes.trim() || null,
            optOut: undefined,
          };

      await upsertTaxProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save tax section', error);
      const message = error instanceof Error ? error.message : 'We could not save this section. Please try again.';
      setErrorMessage(message);
      setSaveState('error');
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
          label="A CPA handles this for me"
        />

        {optedOut ? (
          <TextField
            label="Add context so we can follow up later"
            value={optOutReason}
            onChange={(event) => setOptOutReason(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="filing-status-label">Filing status</InputLabel>
                <Select
                  labelId="filing-status-label"
                  label="Filing status"
                  value={filingStatus}
                  onChange={(event) => setFilingStatus(event.target.value)}
                >
                  {FILING_STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="State of residence"
                placeholder="e.g. VA"
                value={state}
                onChange={(event) => setState(event.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="number"
                label="Marginal rate (%)"
                value={marginalRate}
                onChange={(event) => setMarginalRate(event.target.value)}
                inputProps={{ min: 0, step: 0.5 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Effective rate (%)"
                value={effectiveRate}
                onChange={(event) => setEffectiveRate(event.target.value)}
                inputProps={{ min: 0, step: 0.5 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Withholding (%)"
                value={withholding}
                onChange={(event) => setWithholding(event.target.value)}
                inputProps={{ min: 0, step: 0.5 }}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="number"
                label="Expected refund ($)"
                value={expectedRefund}
                onChange={(event) => setExpectedRefund(event.target.value)}
                inputProps={{ min: 0, step: 50 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Expected payment due ($)"
                value={expectedPayment}
                onChange={(event) => setExpectedPayment(event.target.value)}
                inputProps={{ min: 0, step: 50 }}
                fullWidth
              />
            </Stack>

            <FormControlLabel
              control={<Switch checked={usesCpa} onChange={(event) => setUsesCpa(event.target.checked)} color="primary" />}
              label="I usually work with a CPA or preparer"
            />

            <TextField
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Upcoming life changes, major deductions, military status, etc."
              multiline
              minRows={3}
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
            data-testid="tax-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            These details help us model your real after-tax cashflow and safe withholding.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
