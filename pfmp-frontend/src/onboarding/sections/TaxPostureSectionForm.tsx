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

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TaxPostureSectionForm({ userId, onStatusChange, currentStatus }: TaxPostureSectionFormProps) {
  const [filingStatus, setFilingStatus] = useState('single');
  const [state, setState] = useState('');
  const [marginalRate, setMarginalRate] = useState(''); // Keep for backend compatibility but hide from UI
  const [effectiveRate, setEffectiveRate] = useState(''); // Keep for backend compatibility but hide from UI
  const [withholding, setWithholding] = useState('');
  const [expectedRefund, setExpectedRefund] = useState(''); // Keep for backend compatibility but hide from UI
  const [expectedPayment, setExpectedPayment] = useState(''); // Keep for backend compatibility but hide from UI
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
    // Consider completed if filing status and state are provided (W-4 basics)
    const hasBasicInfo = state.trim() !== '';
    return hasBasicInfo ? 'completed' : 'needs_info';
  }, [optedOut, state]);

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
          label="I don't need tax withholding guidance"
        />

        {optedOut ? (
          <TextField
            label="Add context (optional)"
            value={optOutReason}
            onChange={(event) => setOptOutReason(event.target.value)}
            placeholder="e.g. CPA handles everything, no W-2 income"
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Provide your W-4 withholding information so we can help optimize your tax strategy and cashflow.
            </Typography>

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
              <FormControl fullWidth>
                <InputLabel id="state-label">State of residence</InputLabel>
                <Select
                  labelId="state-label"
                  label="State of residence"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                >
                  {US_STATES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              type="number"
              label="Federal withholding (%)"
              value={withholding}
              onChange={(event) => setWithholding(event.target.value)}
              placeholder="From your W-4"
              helperText="The percentage of your paycheck withheld for federal taxes"
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              fullWidth
            />

            <FormControlLabel
              control={<Switch checked={usesCpa} onChange={(event) => setUsesCpa(event.target.checked)} color="primary" />}
              label="I work with a CPA or tax professional"
            />

            <TextField
              label="Tax notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Military tax benefits, self-employment income, major deductions, state tax quirks"
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        )}

        <Stack direction="row" spacing={2} alignItems="center">
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={error} />
          <Typography variant="body2" color="text.secondary">
            This helps us model your after-tax cashflow and suggest withholding adjustments.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
