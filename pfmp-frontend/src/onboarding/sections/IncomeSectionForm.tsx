import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
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
  Button,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  fetchIncomeStreamsProfile,
  upsertIncomeStreamsProfile,
  type FinancialProfileSectionStatusValue,
  type IncomeStreamsProfilePayload,
  type IncomeStreamPayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

type IncomeSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type IncomeStreamFormState = {
  id: string;
  name: string;
  incomeType: string;
  monthlyAmount: string;
  annualAmount: string;
  isGuaranteed: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const INCOME_TYPE_OPTIONS = [
  { value: 'salary', label: 'Salary / wages' },
  { value: 'rental', label: 'Rental income' },
  { value: 'pension', label: 'Pension' },
  { value: 'va-disability', label: 'VA or disability benefits (nontaxable)' },
  { value: 'ssi', label: 'Social Security retirement' },
  { value: 'business', label: 'Business / self-employed' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'dividends', label: 'Dividends / interest' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_STREAM: IncomeStreamFormState = {
  id: 'income-1',
  name: '',
  incomeType: 'salary',
  monthlyAmount: '',
  annualAmount: '',
  isGuaranteed: false,
  startDate: '',
  endDate: '',
  isActive: true,
};

function createStream(index: number): IncomeStreamFormState {
  return { ...DEFAULT_STREAM, id: `income-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadStreams(streams: IncomeStreamFormState[]): IncomeStreamPayload[] {
  const payloads: IncomeStreamPayload[] = [];

  streams.forEach((stream) => {
    const hasValues =
      stream.name.trim() !== '' ||
      stream.monthlyAmount.trim() !== '' ||
      stream.annualAmount.trim() !== '' ||
      stream.startDate.trim() !== '' ||
      stream.endDate.trim() !== '' ||
      stream.isGuaranteed ||
      stream.isActive === false;

    if (!hasValues) {
      return;
    }

    payloads.push({
      name: stream.name.trim() || null,
      incomeType: stream.incomeType || 'salary',
      monthlyAmount: parseNumber(stream.monthlyAmount) ?? null,
      annualAmount: parseNumber(stream.annualAmount) ?? null,
      isGuaranteed: stream.isGuaranteed,
      startDate: stream.startDate ? new Date(stream.startDate).toISOString() : null,
      endDate: stream.endDate ? new Date(stream.endDate).toISOString() : null,
      isActive: stream.isActive,
    });
  });

  return payloads;
}

export default function IncomeSectionForm({ userId, onStatusChange, currentStatus }: IncomeSectionFormProps) {
  const [streams, setStreams] = useState<IncomeStreamFormState[]>([createStream(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  // manual submit state removed in autosave conversion

  const payloadStreams = useMemo(() => buildPayloadStreams(streams), [streams]);
  const canRemoveStreams = streams.length > 1;

  type HydratedState = {
    streams: IncomeStreamFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: IncomeStreamsProfilePayload): HydratedState => {
    const hydratedStreams = (payload.streams ?? []).map((stream, index) => ({
      id: `income-${index + 1}`,
      name: stream.name ?? '',
      incomeType: stream.incomeType ?? 'salary',
      monthlyAmount: stream.monthlyAmount != null ? String(stream.monthlyAmount) : '',
      annualAmount: stream.annualAmount != null ? String(stream.annualAmount) : '',
      isGuaranteed: stream.isGuaranteed ?? false,
      startDate: stream.startDate ? stream.startDate.slice(0, 10) : '',
      endDate: stream.endDate ? stream.endDate.slice(0, 10) : '',
      isActive: stream.isActive ?? true,
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      streams: hydratedStreams.length > 0 ? hydratedStreams : [createStream(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ streams: nextStreams, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      setStreams(nextStreams);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'income',
    userId,
    fetcher: fetchIncomeStreamsProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleStreamChange = <K extends keyof IncomeStreamFormState>(id: string, key: K, value: IncomeStreamFormState[K]) => {
    setStreams((prev) => prev.map((stream) => (stream.id === id ? { ...stream, [key]: value } : stream)));
  };

  const handleAddStream = () => {
    setStreams((prev) => [...prev, createStream(prev.length + 1)]);
  };

  const handleRemoveStream = (id: string) => {
    setStreams((prev) => {
      const remaining = prev.filter((stream) => stream.id !== id);
      return remaining.length > 0 ? remaining : [createStream(1)];
    });
  };

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
  };

  const buildPayload = useCallback((): IncomeStreamsProfilePayload => {
    if (optedOut) {
      return {
        streams: [],
        optOut: {
          isOptedOut: true,
          reason: optOutReason.trim() || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return { streams: payloadStreams, optOut: undefined };
  }, [optedOut, optOutReason, payloadStreams]);

  const deriveStatus = useCallback((payload: IncomeStreamsProfilePayload): FinancialProfileSectionStatusValue => {
    if (payload.optOut?.isOptedOut) return 'opted_out';
    return payload.streams.length > 0 ? 'completed' : 'needs_info';
  }, []);

  const persistIncome = useCallback(async (draft: IncomeStreamsProfilePayload) => {
    if (!draft.optOut?.isOptedOut && draft.streams.length === 0) {
      throw new Error('Add at least one income stream or opt out of this section.');
    }
    await upsertIncomeStreamsProfile(userId, draft);
    return deriveStatus(draft);
  }, [userId, deriveStatus]);

  const { status: autoStatus, isDirty, error: autoError, lastSavedAt, flush } = useAutoSaveForm<IncomeStreamsProfilePayload>({
    data: buildPayload(),
    persist: persistIncome,
    determineStatus: deriveStatus,
    onStatusResolved: onStatusChange,
    debounceMs: 800,
  });

  useEffect(() => {
    interface PFMPWindow extends Window { __pfmpCurrentSectionFlush?: () => Promise<void>; }
    const w: PFMPWindow = window as PFMPWindow;
    w.__pfmpCurrentSectionFlush = flush;
    return () => { if (w.__pfmpCurrentSectionFlush === flush) w.__pfmpCurrentSectionFlush = undefined; };
  }, [flush]);

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void flush(); }}>
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I’ll share income details later"
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
            {streams.map((stream, index) => (
              <Box key={stream.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#fafcff', position: 'relative' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Income source"
                        placeholder="e.g. GS-14 salary"
                        value={stream.name}
                        onChange={(event) => handleStreamChange(stream.id, 'name', event.target.value)}
                        fullWidth
                      />
                      <FormControl fullWidth>
                        <InputLabel id={`${stream.id}-type-label`}>Income type</InputLabel>
                        <Select
                          labelId={`${stream.id}-type-label`}
                          label="Income type"
                          value={stream.incomeType}
                          onChange={(event) => handleStreamChange(stream.id, 'incomeType', event.target.value)}
                        >
                          {INCOME_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Monthly amount ($)"
                        value={stream.monthlyAmount}
                        onChange={(event) => handleStreamChange(stream.id, 'monthlyAmount', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Annual amount ($)"
                        value={stream.annualAmount}
                        onChange={(event) => handleStreamChange(stream.id, 'annualAmount', event.target.value)}
                        inputProps={{ min: 0, step: 500 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="date"
                        label="Start date"
                        InputLabelProps={{ shrink: true }}
                        value={stream.startDate}
                        onChange={(event) => handleStreamChange(stream.id, 'startDate', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        type="date"
                        label="End date"
                        InputLabelProps={{ shrink: true }}
                        value={stream.endDate}
                        onChange={(event) => handleStreamChange(stream.id, 'endDate', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stream.isGuaranteed}
                            onChange={(event) => handleStreamChange(stream.id, 'isGuaranteed', event.target.checked)}
                          />
                        }
                        label="Guaranteed income"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stream.isActive}
                            onChange={(event) => handleStreamChange(stream.id, 'isActive', event.target.checked)}
                            color="primary"
                          />
                        }
                        label={stream.isActive ? 'Active' : 'Inactive'}
                      />
                    </Stack>
                  </Box>
                  {canRemoveStreams && (
                    <Tooltip title="Remove income stream">
                      <IconButton onClick={() => handleRemoveStream(stream.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Income stream {index + 1}
                </Typography>
              </Box>
            ))}

            <Button
              type="button"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddStream}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add another income stream
            </Button>
          </Stack>
        )}

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Autosave keeps this section in sync.</Typography>
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={autoError} />
        </Stack>
        {autoStatus === 'error' && autoError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {autoError instanceof Error ? autoError.message : String(autoError)}
          </Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          Tell us about recurring income so your cashflow insights stay current.
        </Typography>
      </Stack>
    </Box>
  );
}
