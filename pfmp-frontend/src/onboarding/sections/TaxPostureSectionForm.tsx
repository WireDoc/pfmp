import { useCallback, useEffect, useState } from 'react';
import {
  Box,
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
  fetchTaxProfile,
  upsertTaxProfile,
  type FinancialProfileSectionStatusValue,
  type TaxProfilePayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

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
  // autosave replaces manual save state & error message handling

  type HydratedState = {
    filingStatus: string;
    state: string;
    marginalRate: string;
    effectiveRate: string;
    withholding: string;
    expectedRefund: string;
    expectedPayment: string;
    usesCpa: boolean;
    notes: string;
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: TaxProfilePayload): HydratedState => {
    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      filingStatus: payload.filingStatus ?? 'single',
      state: payload.stateOfResidence ?? '',
      marginalRate: payload.marginalRatePercent != null ? String(payload.marginalRatePercent) : '',
      effectiveRate: payload.effectiveRatePercent != null ? String(payload.effectiveRatePercent) : '',
      withholding: payload.federalWithholdingPercent != null ? String(payload.federalWithholdingPercent) : '',
      expectedRefund: payload.expectedRefundAmount != null ? String(payload.expectedRefundAmount) : '',
      expectedPayment: payload.expectedPaymentAmount != null ? String(payload.expectedPaymentAmount) : '',
      usesCpa: payload.usesCpaOrPreparer ?? false,
      notes: payload.notes ?? '',
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    (next: HydratedState) => {
      setFilingStatus(next.filingStatus || 'single');
      setState(next.state ?? '');
      setMarginalRate(next.marginalRate ?? '');
      setEffectiveRate(next.effectiveRate ?? '');
      setWithholding(next.withholding ?? '');
      setExpectedRefund(next.expectedRefund ?? '');
      setExpectedPayment(next.expectedPayment ?? '');
      setUsesCpa(Boolean(next.usesCpa));
      setNotes(next.notes ?? '');
      setOptedOut(next.optedOut);
      setOptOutReason(next.optOutReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'tax',
    userId,
    fetcher: fetchTaxProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (!checked) setOptOutReason('');
  };

  const deriveStatus = useCallback<() => FinancialProfileSectionStatusValue>(() => {
    if (optedOut) return 'opted_out';
    // Consider completed if at least one meaningful field beyond defaults is provided
    const hasDetail = [state, marginalRate, effectiveRate, withholding, expectedRefund, expectedPayment, notes].some((v) => v.trim() !== '') || usesCpa;
    return hasDetail ? 'completed' : 'needs_info';
  }, [optedOut, state, marginalRate, effectiveRate, withholding, expectedRefund, expectedPayment, notes, usesCpa]);

  const buildPayload = useCallback<() => TaxProfilePayload>(() => {
    if (optedOut) {
      return {
        filingStatus: filingStatus,
        optOut: {
          isOptedOut: true,
          reason: optOutReason.trim() || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return {
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
  }, [optedOut, filingStatus, optOutReason, state, marginalRate, effectiveRate, withholding, expectedRefund, expectedPayment, usesCpa, notes]);

  const persistTax = useCallback(async () => {
    const payload = buildPayload();
    await upsertTaxProfile(userId, payload);
  }, [buildPayload, userId]);

  const { status: autoStatus, flush, isDirty, lastSavedAt, error } = useAutoSaveForm({
    data: {
      filingStatus,
      state,
      marginalRate,
      effectiveRate,
      withholding,
      expectedRefund,
      expectedPayment,
      usesCpa,
      notes,
      optedOut,
      optOutReason,
    },
    debounceMs: 800,
    determineStatus: () => deriveStatus(),
    persist: async () => {
      await persistTax();
      return deriveStatus();
    },
    onStatusResolved: (next) => onStatusChange(next),
  });

  useEffect(() => {
    interface PFMPWindow extends Window { __pfmpCurrentSectionFlush?: () => Promise<void>; }
    const w: PFMPWindow = window as PFMPWindow;
    w.__pfmpCurrentSectionFlush = flush;
    return () => {
      if (w.__pfmpCurrentSectionFlush === flush) {
        w.__pfmpCurrentSectionFlush = undefined;
      }
    };
  }, [flush]);

  return (
    <Box component="form" noValidate>
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

        <Stack direction="row" spacing={2} alignItems="center">
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={error} />
          <Typography variant="body2" color="text.secondary">
            These details help us model your real after-tax cashflow and safe withholding.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
