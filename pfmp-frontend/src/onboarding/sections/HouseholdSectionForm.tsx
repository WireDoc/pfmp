import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import { useSectionHydration } from '../hooks/useSectionHydration';
import {
  fetchHouseholdProfile,
  upsertHouseholdProfile,
  type FinancialProfileSectionStatusValue,
  type HouseholdProfilePayload,
  type SectionOptOutPayload,
} from '../../services/financialProfileApi';

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

function createInitialState(currentStatus: FinancialProfileSectionStatusValue): HouseholdProfilePayload {
  if (currentStatus === 'opted_out') {
    return {
      optOut: {
        isOptedOut: true,
        reason: '',
        acknowledgedAt: new Date().toISOString(),
      },
    };
  }

  return {
    preferredName: '',
    maritalStatus: '',
    dependentCount: undefined,
    serviceNotes: '',
    optOut: undefined,
  };
}

function hasEnteredHouseholdDetails(payload: HouseholdProfilePayload): boolean {
  const preferredName = payload.preferredName?.trim();
  const maritalStatus = payload.maritalStatus?.trim();
  const dependentsProvided = typeof payload.dependentCount === 'number';
  const notes = payload.serviceNotes?.trim();

  const coreIdentityProvided = Boolean(preferredName && maritalStatus);
  const supportingDetailsProvided = dependentsProvided || Boolean(notes);

  return coreIdentityProvided || (Boolean(maritalStatus) && supportingDetailsProvided) || (Boolean(preferredName) && supportingDetailsProvided);
}


function sanitizeOptOut(optOut?: SectionOptOutPayload | null): SectionOptOutPayload | undefined {
  if (!optOut?.isOptedOut) return undefined;
  const reason = optOut.reason?.trim();
  return {
    isOptedOut: true,
    reason: reason && reason.length > 0 ? reason : undefined,
    acknowledgedAt: optOut.acknowledgedAt ?? new Date().toISOString(),
  };
}

function sanitizePayload(draft: HouseholdProfilePayload): HouseholdProfilePayload {
  if (draft.optOut?.isOptedOut) {
    return {
      optOut: sanitizeOptOut(draft.optOut),
    };
  }

  return {
    preferredName: draft.preferredName?.trim() || undefined,
    maritalStatus: draft.maritalStatus?.trim() || undefined,
    dependentCount: draft.dependentCount ?? undefined,
    serviceNotes: draft.serviceNotes?.trim() || undefined,
    optOut: undefined,
  };
}

export default function HouseholdSectionForm({ userId, onStatusChange, currentStatus }: HouseholdSectionFormProps) {
  const [formState, setFormState] = useState<HouseholdProfilePayload>(() => createInitialState(currentStatus));
  const optedOut = useMemo(() => formState.optOut?.isOptedOut === true, [formState.optOut]);

  const persistHousehold = useCallback(
    async (draft: HouseholdProfilePayload) => {
      const payload = sanitizePayload(draft);
      await upsertHouseholdProfile(userId, payload);
      
      if (import.meta.env?.DEV) {
        console.log('[HouseholdSectionForm] persistHousehold called:', {
          preferredName: payload.preferredName,
          maritalStatus: payload.maritalStatus,
          dependentCount: payload.dependentCount,
          hasDetails: hasEnteredHouseholdDetails(draft),
          isOptedOut: draft.optOut?.isOptedOut,
        });
      }
      
      if (draft.optOut?.isOptedOut) {
        if (import.meta.env?.DEV) console.log('[HouseholdSectionForm] returning: opted_out');
        return 'opted_out';
      }

      // Mark as completed if user has entered sufficient household details
      // This allows autosave to properly update the status chip in real-time
      if (hasEnteredHouseholdDetails(draft)) {
        if (import.meta.env?.DEV) console.log('[HouseholdSectionForm] returning: completed');
        return 'completed';
      }

      if (import.meta.env?.DEV) console.log('[HouseholdSectionForm] returning: needs_info');
      return 'needs_info';
    },
    [userId],
  );

  const {
    status: autoStatus,
    isDirty,
    error: autoError,
    lastSavedAt,
    flush,
    resetBaseline,
  } = useAutoSaveForm({
    data: formState,
    persist: persistHousehold,
    onStatusResolved: onStatusChange,
  });

  const applyHydratedState = useCallback((nextState: HouseholdProfilePayload) => {
    let applied: HouseholdProfilePayload = nextState;

    setFormState((previous) => {
      if (nextState.optOut?.isOptedOut) {
        applied = {
          optOut: {
            isOptedOut: true,
            reason: nextState.optOut?.reason ?? '',
            acknowledgedAt: nextState.optOut?.acknowledgedAt ?? new Date().toISOString(),
          },
        };
        return applied;
      }

      const merged: HouseholdProfilePayload = {
        preferredName: previous.preferredName ?? '',
        maritalStatus: previous.maritalStatus ?? '',
        dependentCount: typeof previous.dependentCount === 'number' ? previous.dependentCount : undefined,
        serviceNotes: previous.serviceNotes ?? '',
        optOut: undefined,
      };

      if (typeof nextState.preferredName === 'string' && nextState.preferredName.trim().length > 0) {
        merged.preferredName = nextState.preferredName;
      }

      if (typeof nextState.maritalStatus === 'string' && nextState.maritalStatus.trim().length > 0) {
        merged.maritalStatus = nextState.maritalStatus;
      }

      if (typeof nextState.dependentCount === 'number') {
        merged.dependentCount = nextState.dependentCount;
      }

      if (typeof nextState.serviceNotes === 'string' && nextState.serviceNotes.trim().length > 0) {
        merged.serviceNotes = nextState.serviceNotes;
      }

      applied = merged;
      return merged;
    });

    return applied;
  }, []);

  const mapPayloadToState = useCallback((payload: HouseholdProfilePayload): HouseholdProfilePayload => {
    if (payload.optOut?.isOptedOut) {
      return {
        optOut: {
          isOptedOut: true,
          reason: payload.optOut.reason ?? '',
          acknowledgedAt: payload.optOut.acknowledgedAt ?? new Date().toISOString(),
        },
      };
    }

    return {
      preferredName: payload.preferredName ?? '',
      maritalStatus: payload.maritalStatus ?? '',
      dependentCount: typeof payload.dependentCount === 'number' ? payload.dependentCount : undefined,
      serviceNotes: payload.serviceNotes ?? '',
      optOut: undefined,
    };
  }, []);

  useSectionHydration({
    sectionKey: 'household',
    userId,
    fetcher: fetchHouseholdProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
    resetBaseline,
  });

  useEffect(() => {
    interface PFMPWindow extends Window {
      __pfmpCurrentSectionFlush?: () => Promise<void>;
    }
    const w: PFMPWindow = window as PFMPWindow;
    w.__pfmpCurrentSectionFlush = flush;
    return () => {
      if (w.__pfmpCurrentSectionFlush === flush) {
        w.__pfmpCurrentSectionFlush = undefined;
      }
    };
  }, [flush]);

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
          acknowledgedAt: prev.optOut?.acknowledgedAt ?? new Date().toISOString(),
        },
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        optOut: undefined,
      }));
    }
  };

  const errorMessage = autoError instanceof Error ? autoError.message : autoError ? 'We could not save this section. Please try again.' : null;

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void flush();
      }}
    >
      <Stack spacing={3} sx={{ mt: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
            Autosave keeps this section in sync.
          </Typography>
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={autoError} />
        </Stack>

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

        {autoStatus === 'error' && errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Autosave keeps this section in sync.
        </Typography>
      </Stack>
    </Box>
  );
}
