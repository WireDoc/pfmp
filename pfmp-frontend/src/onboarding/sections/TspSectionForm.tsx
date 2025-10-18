import { useCallback, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  fetchTspProfile,
  upsertTspProfile,
  type FinancialProfileSectionStatusValue,
  type TspProfilePayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type TspSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

const percentFieldProps = { inputProps: { min: 0, max: 100, step: 0.1 } } as const;

function parseNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TspSectionForm({ userId, onStatusChange, currentStatus }: TspSectionFormProps) {
  const [formState, setFormState] = useState<TspProfilePayload>(() => ({
    contributionRatePercent: undefined,
    employerMatchPercent: undefined,
    currentBalance: undefined,
    targetBalance: undefined,
    gFundPercent: undefined,
    fFundPercent: undefined,
    cFundPercent: undefined,
    sFundPercent: undefined,
    iFundPercent: undefined,
    lifecyclePercent: undefined,
    lifecycleBalance: undefined,
    lifecyclePositions: [
      { fundCode: 'L2030', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2035', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2040', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2045', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2050', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2055', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2060', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2065', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2070', allocationPercent: undefined, units: undefined },
      { fundCode: 'L2075', allocationPercent: undefined, units: undefined },
    ],
    optOut:
      currentStatus === 'opted_out'
        ? { isOptedOut: true, reason: '', acknowledgedAt: new Date().toISOString() }
        : undefined,
  }));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const optedOut = formState.optOut?.isOptedOut === true;

  const mapPayloadToState = useCallback((payload: TspProfilePayload): TspProfilePayload => {
    if (payload.optOut?.isOptedOut) {
      return {
        contributionRatePercent: undefined,
        employerMatchPercent: undefined,
        currentBalance: undefined,
        targetBalance: undefined,
        gFundPercent: undefined,
        fFundPercent: undefined,
        cFundPercent: undefined,
        sFundPercent: undefined,
        iFundPercent: undefined,
    lifecyclePercent: undefined,
    lifecycleBalance: undefined,
    lifecyclePositions: [],
        optOut: {
          isOptedOut: true,
          reason: payload.optOut.reason ?? '',
          acknowledgedAt: payload.optOut.acknowledgedAt ?? new Date().toISOString(),
        },
      };
    }

    return {
      contributionRatePercent: payload.contributionRatePercent ?? undefined,
      employerMatchPercent: payload.employerMatchPercent ?? undefined,
      currentBalance: payload.currentBalance ?? undefined,
      targetBalance: payload.targetBalance ?? undefined,
      gFundPercent: payload.gFundPercent ?? undefined,
      fFundPercent: payload.fFundPercent ?? undefined,
      cFundPercent: payload.cFundPercent ?? undefined,
      sFundPercent: payload.sFundPercent ?? undefined,
      iFundPercent: payload.iFundPercent ?? undefined,
      lifecyclePercent: payload.lifecyclePercent ?? undefined,
      lifecycleBalance: payload.lifecycleBalance ?? undefined,
      lifecyclePositions:
        Array.isArray(payload.lifecyclePositions) && (payload.lifecyclePositions?.length ?? 0) > 0
          ? payload.lifecyclePositions
          : [
            { fundCode: 'L2030', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2035', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2040', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2045', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2050', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2055', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2060', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2065', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2070', allocationPercent: undefined, units: undefined },
            { fundCode: 'L2075', allocationPercent: undefined, units: undefined },
          ],
      optOut: undefined,
    };
  }, []);

  useSectionHydration({
    sectionKey: 'tsp',
    userId,
    fetcher: fetchTspProfile,
    mapPayloadToState,
    applyState: setFormState,
  });

  const updateField = <K extends keyof TspProfilePayload>(key: K, value: TspProfilePayload[K]) => {
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
      await upsertTspProfile(userId, {
        ...formState,
        contributionRatePercent: optedOut ? undefined : formState.contributionRatePercent,
        employerMatchPercent: optedOut ? undefined : formState.employerMatchPercent,
        currentBalance: optedOut ? undefined : formState.currentBalance,
        targetBalance: optedOut ? undefined : formState.targetBalance,
        gFundPercent: optedOut ? undefined : formState.gFundPercent,
        fFundPercent: optedOut ? undefined : formState.fFundPercent,
        cFundPercent: optedOut ? undefined : formState.cFundPercent,
        sFundPercent: optedOut ? undefined : formState.sFundPercent,
    iFundPercent: optedOut ? undefined : formState.iFundPercent,
    lifecyclePercent: optedOut ? undefined : formState.lifecyclePercent,
    lifecycleBalance: optedOut ? undefined : formState.lifecycleBalance,
    lifecyclePositions: optedOut ? [] : formState.lifecyclePositions,
        optOut: optedOut ? formState.optOut : undefined,
      });

      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save TSP profile', error);
      setErrorMessage('We hit a snag while saving your TSP details. Please try again.');
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
          label="I don’t invest in the Thrift Savings Plan"
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
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                type="number"
                label="Contribution rate (%)"
                value={formState.contributionRatePercent ?? ''}
                onChange={(event) => updateField('contributionRatePercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
              <TextField
                type="number"
                label="Employer match (%)"
                value={formState.employerMatchPercent ?? ''}
                onChange={(event) => updateField('employerMatchPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                type="number"
                label="Current balance ($)"
                value={formState.currentBalance ?? ''}
                onChange={(event) => updateField('currentBalance', parseNumber(event.target.value))}
                fullWidth
              />
              <TextField
                type="number"
                label="Target balance ($)"
                value={formState.targetBalance ?? ''}
                onChange={(event) => updateField('targetBalance', parseNumber(event.target.value))}
                fullWidth
              />
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Allocation mix
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              <TextField
                type="number"
                label="G Fund (%)"
                value={formState.gFundPercent ?? ''}
                onChange={(event) => updateField('gFundPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
              <TextField
                type="number"
                label="F Fund (%)"
                value={formState.fFundPercent ?? ''}
                onChange={(event) => updateField('fFundPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
              <TextField
                type="number"
                label="C Fund (%)"
                value={formState.cFundPercent ?? ''}
                onChange={(event) => updateField('cFundPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
              }}
            >
              <TextField
                type="number"
                label="S Fund (%)"
                value={formState.sFundPercent ?? ''}
                onChange={(event) => updateField('sFundPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
              <TextField
                type="number"
                label="I Fund (%)"
                value={formState.iFundPercent ?? ''}
                onChange={(event) => updateField('iFundPercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
              <TextField
                type="number"
                label="Lifecycle fund (%)"
                value={formState.lifecyclePercent ?? ''}
                onChange={(event) => updateField('lifecyclePercent', parseNumber(event.target.value))}
                fullWidth
                {...percentFieldProps}
              />
            </Box>

            <TextField
              type="number"
              label="Lifecycle fund balance ($)"
              value={formState.lifecycleBalance ?? ''}
              onChange={(event) => updateField('lifecycleBalance', parseNumber(event.target.value))}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Lifecycle funds (allocation % and units)
            </Typography>
            <Box sx={{ display: 'grid', gap: 12 }}>
              {formState.lifecyclePositions?.map((pos, idx) => (
                <Box
                  key={pos.fundCode}
                  sx={{
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: { xs: '1fr', md: '200px 1fr 1fr' },
                    alignItems: 'center',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    padding: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{pos.fundCode}</Typography>
                  <TextField
                    type="number"
                    label="Allocation (%)"
                    value={pos.allocationPercent ?? ''}
                    onChange={(e) => {
                      const value = parseNumber(e.target.value);
                      setFormState((prev) => {
                        const next = [...(prev.lifecyclePositions ?? [])];
                        next[idx] = { ...next[idx], allocationPercent: value };
                        return { ...prev, lifecyclePositions: next };
                      });
                    }}
                    fullWidth
                    {...percentFieldProps}
                  />
                  <TextField
                    type="number"
                    label="Units"
                    value={pos.units ?? ''}
                    onChange={(e) => {
                      const value = parseNumber(e.target.value);
                      setFormState((prev) => {
                        const next = [...(prev.lifecyclePositions ?? [])];
                        next[idx] = { ...next[idx], units: value };
                        return { ...prev, lifecyclePositions: next };
                      });
                    }}
                    fullWidth
                    inputProps={{ step: 0.000001 }}
                  />
                </Box>
              ))}
            </Box>
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
            data-testid="tsp-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            These details help customize your allocation advice.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
