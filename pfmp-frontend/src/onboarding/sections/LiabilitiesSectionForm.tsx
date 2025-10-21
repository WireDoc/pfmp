import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  fetchLiabilitiesProfile,
  upsertLiabilitiesProfile,
  type FinancialProfileSectionStatusValue,
  type LiabilitiesProfilePayload,
  type LiabilityPayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

type LiabilitiesSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type LiabilityFormState = {
  id: string;
  liabilityType: string;
  lender: string;
  currentBalance: string;
  interestRateApr: string;
  minimumPayment: string;
  payoffTargetDate: string;
  isPriorityToEliminate: boolean;
};

const LIABILITY_TYPE_OPTIONS = [
  { value: 'credit-card', label: 'Credit card / revolving' },
  { value: 'student-loan', label: 'Student loan' },
  { value: 'auto-loan', label: 'Auto loan' },
  { value: 'personal-loan', label: 'Personal loan' },
  { value: 'heloc', label: 'HELOC / second mortgage' },
  { value: 'medical', label: 'Medical debt' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_LIABILITY: LiabilityFormState = {
  id: 'liability-1',
  liabilityType: 'credit-card',
  lender: '',
  currentBalance: '',
  interestRateApr: '',
  minimumPayment: '',
  payoffTargetDate: '',
  isPriorityToEliminate: false,
};

function createLiability(index: number): LiabilityFormState {
  return { ...DEFAULT_LIABILITY, id: `liability-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadLiabilities(liabilities: LiabilityFormState[]): LiabilityPayload[] {
  const payloads: LiabilityPayload[] = [];

  liabilities.forEach((item) => {
    const hasValue =
      item.lender.trim() !== '' ||
      item.currentBalance.trim() !== '' ||
      item.minimumPayment.trim() !== '' ||
      item.interestRateApr.trim() !== '' ||
      item.payoffTargetDate.trim() !== '' ||
      item.isPriorityToEliminate;

    if (!hasValue) {
      return;
    }

    payloads.push({
      liabilityType: item.liabilityType || 'other',
      lender: item.lender.trim() || null,
      currentBalance: parseNumber(item.currentBalance) ?? null,
      minimumPayment: parseNumber(item.minimumPayment) ?? null,
      interestRateApr: parseNumber(item.interestRateApr) ?? null,
      payoffTargetDate: item.payoffTargetDate ? new Date(item.payoffTargetDate).toISOString() : null,
      isPriorityToEliminate: item.isPriorityToEliminate,
    });
  });

  return payloads;
}

export default function LiabilitiesSectionForm({ userId, onStatusChange, currentStatus }: LiabilitiesSectionFormProps) {
  const [liabilities, setLiabilities] = useState<LiabilityFormState[]>([createLiability(1)]);
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  // local state only for form fields; autosave hook exposes error

  const canRemoveRows = liabilities.length > 1;
  const payloadLiabilities = useMemo(() => buildPayloadLiabilities(liabilities), [liabilities]);

  type HydratedState = {
    liabilities: LiabilityFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: LiabilitiesProfilePayload): HydratedState => {
    const hydratedLiabilities = (payload.liabilities ?? []).map((item, index) => ({
      id: `liability-${index + 1}`,
      liabilityType: item.liabilityType ?? 'other',
      lender: item.lender ?? '',
      currentBalance: item.currentBalance != null ? String(item.currentBalance) : '',
      interestRateApr: item.interestRateApr != null ? String(item.interestRateApr) : '',
      minimumPayment: item.minimumPayment != null ? String(item.minimumPayment) : '',
      payoffTargetDate: item.payoffTargetDate ? item.payoffTargetDate.slice(0, 10) : '',
      isPriorityToEliminate: item.isPriorityToEliminate ?? false,
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      liabilities: hydratedLiabilities.length > 0 ? hydratedLiabilities : [createLiability(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ liabilities: nextLiabilities, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      setLiabilities(nextLiabilities);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'liabilities',
    userId,
    fetcher: fetchLiabilitiesProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleLiabilityChange = <K extends keyof LiabilityFormState>(id: string, key: K, value: LiabilityFormState[K]) => {
    setLiabilities((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleAddLiability = () => {
    setLiabilities((prev) => [...prev, createLiability(prev.length + 1)]);
  };

  const handleRemoveLiability = (id: string) => {
    setLiabilities((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [createLiability(1)];
    });
  };

  const deriveStatus = useCallback<() => FinancialProfileSectionStatusValue>(() => {
    if (optedOut) return 'opted_out';
    return payloadLiabilities.length > 0 ? 'completed' : 'needs_info';
  }, [optedOut, payloadLiabilities.length]);

  const buildPayload = useCallback<() => LiabilitiesProfilePayload>(() => {
    if (optedOut) {
      return {
        liabilities: [],
        optOut: {
          isOptedOut: true,
          reason: optOutReason.trim() || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return {
      liabilities: payloadLiabilities,
      optOut: undefined,
    };
  }, [optedOut, optOutReason, payloadLiabilities]);

  const persistLiabilities = useCallback(async () => {
    const payload = buildPayload();
    await upsertLiabilitiesProfile(userId, payload);
  }, [buildPayload, userId]);

  const { status: autoStatus, flush, isDirty, lastSavedAt, error } = useAutoSaveForm({
    data: { liabilities, optedOut, optOutReason },
    debounceMs: 800,
    determineStatus: () => deriveStatus(),
    persist: async () => {
      await persistLiabilities();
      return deriveStatus();
    },
    onStatusResolved: (next) => onStatusChange(next),
    onPersistError: () => {
      /* error handled via hook error */
    },
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

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (!checked) {
      // If toggling back in, clear any previous opt-out reason
      setOptOutReason('');
    }
  };

  return (
    <Box component="form" noValidate>
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I’m not tracking debts right now"
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
            {liabilities.map((item, index) => (
              <Box key={item.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, position: 'relative', background: '#f9fbff' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id={`${item.id}-type-label`}>Liability type</InputLabel>
                        <Select
                          labelId={`${item.id}-type-label`}
                          label="Liability type"
                          value={item.liabilityType}
                          onChange={(event) => handleLiabilityChange(item.id, 'liabilityType', event.target.value)}
                        >
                          {LIABILITY_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Lender / account name"
                        value={item.lender}
                        onChange={(event) => handleLiabilityChange(item.id, 'lender', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Current balance ($)"
                        value={item.currentBalance}
                        onChange={(event) => handleLiabilityChange(item.id, 'currentBalance', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Minimum payment ($)"
                        value={item.minimumPayment}
                        onChange={(event) => handleLiabilityChange(item.id, 'minimumPayment', event.target.value)}
                        inputProps={{ min: 0, step: 10 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Interest rate (APR %)"
                        value={item.interestRateApr}
                        onChange={(event) => handleLiabilityChange(item.id, 'interestRateApr', event.target.value)}
                        inputProps={{ min: 0, step: 0.1 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="date"
                        label="Payoff target"
                        InputLabelProps={{ shrink: true }}
                        value={item.payoffTargetDate}
                        onChange={(event) => handleLiabilityChange(item.id, 'payoffTargetDate', event.target.value)}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.isPriorityToEliminate}
                            onChange={(event) => handleLiabilityChange(item.id, 'isPriorityToEliminate', event.target.checked)}
                          />
                        }
                        label="Top payoff priority"
                      />
                    </Stack>
                  </Box>
                  {canRemoveRows && (
                    <Tooltip title="Remove liability">
                      <IconButton onClick={() => handleRemoveLiability(item.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Liability {index + 1}
                </Typography>
              </Box>
            ))}

            <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddLiability} sx={{ alignSelf: 'flex-start' }}>
              Add another liability
            </Button>
          </Stack>
        )}

        <Stack direction="row" spacing={2} alignItems="center">
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={error} />
          <Typography variant="body2" color="text.secondary">
            Track your debts so we can recommend payoff strategies and watch interest drag.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
