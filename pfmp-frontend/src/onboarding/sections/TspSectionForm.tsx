import { useCallback, useMemo, useRef, useState } from 'react';
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
  Grid,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
      { fundCode: 'G', contributionPercent: undefined, units: undefined },
      { fundCode: 'F', contributionPercent: undefined, units: undefined },
      { fundCode: 'C', contributionPercent: undefined, units: undefined },
      { fundCode: 'S', contributionPercent: undefined, units: undefined },
      { fundCode: 'I', contributionPercent: undefined, units: undefined },
      { fundCode: 'L-INCOME', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2030', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2035', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2040', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2045', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2050', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2055', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2060', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2065', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2070', contributionPercent: undefined, units: undefined },
      { fundCode: 'L2075', contributionPercent: undefined, units: undefined },
    ],
    optOut:
      currentStatus === 'opted_out'
        ? { isOptedOut: true, reason: '', acknowledgedAt: new Date().toISOString() }
        : undefined,
  }));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Read-only computed summary (balances/mix/total/as-of) is intentionally omitted from onboarding

  const optedOut = formState.optOut?.isOptedOut === true;
  const initialStateRef = useRef<TspProfilePayload | null>(null);
  const allFundCodes = useMemo(
    () => [
      'G','F','C','S','I',
      'L-INCOME','L2030','L2035','L2040','L2045','L2050','L2055','L2060','L2065','L2070','L2075',
    ],
    []
  );
  const computeSelectedFunds = useCallback((payload: TspProfilePayload): string[] => {
    const positions = payload.lifecyclePositions ?? [];
    const picked = positions
      .filter((p) => typeof p.units === 'number' && (p.units ?? 0) > 0)
      .map((p) => String(p.fundCode));
    // Default to empty; users can add funds via the dropdown
    return picked;
  }, []);
  const [selectedFunds, setSelectedFunds] = useState<string[]>(() => computeSelectedFunds(formState));
  const [fundToAdd, setFundToAdd] = useState<string>('');
  const [resetOpen, setResetOpen] = useState(false);

  const friendlyLabel = useMemo(
    () =>
      new Map<string, string>([
        ['G', 'G Fund'],
        ['F', 'F Fund'],
        ['C', 'C Fund'],
        ['S', 'S Fund'],
        ['I', 'I Fund'],
        ['L-INCOME', 'L-Income'],
        ['L2030', 'L2030'],
        ['L2035', 'L2035'],
        ['L2040', 'L2040'],
        ['L2045', 'L2045'],
        ['L2050', 'L2050'],
        ['L2055', 'L2055'],
        ['L2060', 'L2060'],
        ['L2065', 'L2065'],
        ['L2070', 'L2070'],
        ['L2075', 'L2075'],
      ]),
    []
  );

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

    // Ensure all base and lifecycle funds render by merging payload with defaults
    type Position = NonNullable<TspProfilePayload['lifecyclePositions']>[number];
    type FundCode = Position['fundCode'];
    const defaults: FundCode[] = [
      'G',
      'F',
      'C',
      'S',
      'I',
      'L-INCOME',
      'L2030',
      'L2035',
      'L2040',
      'L2045',
      'L2050',
      'L2055',
      'L2060',
      'L2065',
      'L2070',
      'L2075',
    ];
    const incoming = Array.isArray(payload.lifecyclePositions) ? payload.lifecyclePositions : [];
    const byCode = new Map<FundCode, Position>(incoming.map((p) => [p.fundCode, p] as const));
  const merged: Position[] = defaults.map((code) => byCode.get(code) ?? { fundCode: code, contributionPercent: undefined, units: undefined });

    return {
      contributionRatePercent: payload.contributionRatePercent ?? undefined,
      employerMatchPercent: payload.employerMatchPercent ?? undefined,
      currentBalance: undefined,
      targetBalance: undefined,
      gFundPercent: undefined,
      fFundPercent: undefined,
      cFundPercent: undefined,
      sFundPercent: undefined,
      iFundPercent: undefined,
      lifecyclePercent: undefined,
      lifecycleBalance: undefined,
      lifecyclePositions: merged,
      optOut: undefined,
    };
  }, []);

  useSectionHydration({
    sectionKey: 'tsp',
    userId,
    fetcher: fetchTspProfile,
    mapPayloadToState,
    applyState: (data) => {
      initialStateRef.current = data;
      setFormState(data);
      setSelectedFunds(computeSelectedFunds(data));
    },
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

  const totalPercent = useMemo(() =>
    (formState.lifecyclePositions ?? []).reduce((sum, p) => sum + (Number(p.contributionPercent ?? 0) || 0), 0),
    [formState.lifecyclePositions]
  );
  const percentIsValid = Math.abs(totalPercent - 100) < 0.001;

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);
    try {
      // Derive legacy base fund percent fields for backend compatibility
      const codeToPercent = new Map(
        (formState.lifecyclePositions ?? [])
          .filter((p) => p.fundCode === 'G' || p.fundCode === 'F' || p.fundCode === 'C' || p.fundCode === 'S' || p.fundCode === 'I')
          .map((p) => [p.fundCode, p.contributionPercent ?? undefined] as const)
      );
      const lifecyclePercentDerived = (formState.lifecyclePositions ?? [])
        .filter((p) => String(p.fundCode).startsWith('L'))
        .reduce((sum, p) => sum + (p.contributionPercent ?? 0), 0);

      await upsertTspProfile(userId, {
        ...formState,
        contributionRatePercent: optedOut ? undefined : formState.contributionRatePercent,
        employerMatchPercent: optedOut ? undefined : formState.employerMatchPercent,
        currentBalance: undefined,
        targetBalance: undefined,
        gFundPercent: optedOut ? undefined : (codeToPercent.get('G') ?? undefined),
        fFundPercent: optedOut ? undefined : (codeToPercent.get('F') ?? undefined),
        cFundPercent: optedOut ? undefined : (codeToPercent.get('C') ?? undefined),
        sFundPercent: optedOut ? undefined : (codeToPercent.get('S') ?? undefined),
        iFundPercent: optedOut ? undefined : (codeToPercent.get('I') ?? undefined),
        lifecyclePercent: optedOut ? undefined : lifecyclePercentDerived,
        lifecycleBalance: undefined,
        lifecyclePositions: optedOut ? [] : (formState.lifecyclePositions ?? []).map((p) => ({
          ...p,
          contributionPercent: typeof p.contributionPercent === 'number' ? Math.max(0, Math.min(100, p.contributionPercent)) : p.contributionPercent,
        })),
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
      <Stack spacing={3}>
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
            <TextField
              type="number"
              label="Contribution rate (%)"
              value={formState.contributionRatePercent ?? ''}
              onChange={(event) => updateField('contributionRatePercent', parseNumber(event.target.value))}
              fullWidth
              {...percentFieldProps}
            />
            {/* Employer match is computed automatically by the backend; hide input */}

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Contribution settings
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              TSP funds (allocation % and units)
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="Add fund"
                  value={fundToAdd}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFundToAdd('');
                    if (!value) return;
                    if (!selectedFunds.includes(value)) {
                      setSelectedFunds((prev) => [...prev, value]);
                    }
                  }}
                  fullWidth
                  disabled={allFundCodes.filter((c) => !selectedFunds.includes(c)).length === 0}
                >
                  {allFundCodes
                    .filter((code) => !selectedFunds.includes(code))
                    .map((code) => (
                      <MenuItem key={code} value={code}>
                        {friendlyLabel.get(code) ?? code}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Select a fund to add rows. Remove any you don’t need.
                </Typography>
              </Grid>
            </Grid>

            {/* Quick-set actions removed per spec */}

            {/* Compact, selectable table of funds */}
            <TableContainer>
              <Table size="small" aria-label="Selected TSP funds">
                <TableHead>
                  <TableRow>
                    <TableCell>Fund</TableCell>
                    <TableCell>Contribution (%)</TableCell>
                    <TableCell>Units</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                {selectedFunds.map((code) => {
                  const index = (formState.lifecyclePositions ?? []).findIndex((p) => p.fundCode === code);
                  type PositionRow = NonNullable<TspProfilePayload['lifecyclePositions']>[number];
                  const pos: PositionRow = index >= 0
                    ? (formState.lifecyclePositions ?? [])[index] as PositionRow
                    : { fundCode: code as PositionRow['fundCode'], contributionPercent: undefined, units: undefined };
                  return (
                    <TableRow key={code}>
                      <TableCell>
                        <Typography noWrap>{friendlyLabel.get(code) ?? code}</Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          inputProps={{ ...percentFieldProps.inputProps, 'aria-label': 'Contribution (%)' }}
                          value={pos.contributionPercent ?? ''}
                          onChange={(e) => {
                            const value = parseNumber(e.target.value);
                            setFormState((prev) => {
                              const next = [...(prev.lifecyclePositions ?? [])];
                              const idx = next.findIndex((p) => p.fundCode === code);
                              const clamped = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : value;
                              if (idx >= 0) next[idx] = { ...next[idx], contributionPercent: clamped, dateUpdated: new Date().toISOString() };
                              return { ...prev, lifecyclePositions: next };
                            });
                          }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          inputProps={{ step: 0.000001, 'aria-label': 'Units' }}
                          value={pos.units ?? ''}
                          onChange={(e) => {
                            const value = parseNumber(e.target.value);
                            setFormState((prev) => {
                              const next = [...(prev.lifecyclePositions ?? [])];
                              const idx = next.findIndex((p) => p.fundCode === code);
                              if (idx >= 0) next[idx] = { ...next[idx], units: value, dateUpdated: new Date().toISOString() };
                              return { ...prev, lifecyclePositions: next };
                            });
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="text"
                          color="secondary"
                          onClick={() => {
                            setSelectedFunds((prev) => prev.filter((f) => f !== code));
                            setFormState((prev) => {
                              const next = [...(prev.lifecyclePositions ?? [])];
                              const idx = next.findIndex((p) => p.fundCode === code);
                              if (idx >= 0) next[idx] = { ...next[idx], contributionPercent: undefined, units: undefined, dateUpdated: new Date().toISOString() };
                              return { ...prev, lifecyclePositions: next };
                            });
                          }}
                          size="small"
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </TableContainer>
            {!percentIsValid && (
              <Alert severity="warning">Contribution must total 100%. Current total: {Number.isFinite(totalPercent) ? totalPercent : 0}%.</Alert>
            )}
          </Stack>
        )}

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {saveState === 'success' && <Alert severity="success">Section saved.</Alert>}

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={saveState === 'saving' ? <CircularProgress size={18} /> : undefined}
            onClick={() => void handleSubmit()}
            disabled={saveState === 'saving' || (!optedOut && !percentIsValid)}
            data-testid="tsp-submit"
          >
            {saveState === 'saving' ? 'Saving' : (optedOut ? 'Acknowledge opt-out' : 'Save section')}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setResetOpen(true)}
          >
            Reset
          </Button>
          <Typography variant="body2" color="text.secondary">
            These details help customize your allocation advice.
          </Typography>
        </Stack>

        {/* Reset confirmation dialog */}
        <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
          <DialogTitle>Reset TSP section?</DialogTitle>
          <DialogContent>
            Are you sure you want to reset this section? This will clear all values but won’t save until you click Save.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetOpen(false)} color="secondary">Cancel</Button>
            <Button
              onClick={() => {
                setResetOpen(false);
                setFormState((prev) => ({
                  ...prev,
                  contributionRatePercent: 0,
                  // keep opt-out as-is
                  lifecyclePositions: (prev.lifecyclePositions ?? []).map((p) => ({
                    ...p,
                    contributionPercent: 0,
                    units: 0,
                    dateUpdated: new Date().toISOString(),
                  })),
                }));
                setSelectedFunds([]);
              }}
              color="primary"
              variant="contained"
            >
              Yes, reset
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
