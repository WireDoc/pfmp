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
  fetchRiskGoalsProfile,
  type FinancialProfileSectionStatusValue,
  type RiskGoalsProfilePayload,
  type SectionOptOutPayload,
  upsertRiskGoalsProfile,
} from '../../services/financialProfileApi';

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

function createInitialState(currentStatus: FinancialProfileSectionStatusValue): RiskGoalsProfilePayload {
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
    riskTolerance: undefined,
    targetRetirementDate: undefined,
    passiveIncomeGoal: undefined,
    liquidityBufferMonths: undefined,
    emergencyFundTarget: undefined,
    optOut: undefined,
  };
}

function hasCompletedRiskGoals(payload: RiskGoalsProfilePayload): boolean {
  const hasTolerance = typeof payload.riskTolerance === 'number';
  const hasRetirementDate = Boolean(payload.targetRetirementDate);
  const hasPassiveIncome = typeof payload.passiveIncomeGoal === 'number';
  const hasLiquidity = typeof payload.liquidityBufferMonths === 'number';
  const hasEmergencyFund = typeof payload.emergencyFundTarget === 'number';

  return hasTolerance && hasRetirementDate && hasPassiveIncome && hasLiquidity && hasEmergencyFund;
}

function deriveStatus(payload: RiskGoalsProfilePayload): FinancialProfileSectionStatusValue {
  if (payload.optOut?.isOptedOut) {
    return 'opted_out';
  }

  return hasCompletedRiskGoals(payload) ? 'completed' : 'needs_info';
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

function sanitizePayload(draft: RiskGoalsProfilePayload): RiskGoalsProfilePayload {
  if (draft.optOut?.isOptedOut) {
    return {
      optOut: sanitizeOptOut(draft.optOut),
    };
  }

  return {
    riskTolerance: draft.riskTolerance ?? undefined,
    targetRetirementDate: draft.targetRetirementDate ? new Date(draft.targetRetirementDate).toISOString() : undefined,
    passiveIncomeGoal: draft.passiveIncomeGoal ?? undefined,
    liquidityBufferMonths: draft.liquidityBufferMonths ?? undefined,
    emergencyFundTarget: draft.emergencyFundTarget ?? undefined,
    optOut: undefined,
  };
}

export default function RiskGoalsSectionForm({ userId, onStatusChange, currentStatus }: RiskGoalsSectionFormProps) {
  const [formState, setFormState] = useState<RiskGoalsProfilePayload>(() => createInitialState(currentStatus));
  const optedOut = useMemo(() => formState.optOut?.isOptedOut === true, [formState.optOut]);

  const persistRiskGoals = useCallback(
    async (draft: RiskGoalsProfilePayload) => {
      const payload = sanitizePayload(draft);
      await upsertRiskGoalsProfile(userId, payload);
      // Derive status from sanitized payload to avoid mismatch if sanitize strips fields.
      return deriveStatus(payload);
    },
    [userId],
  );

  const { status: autoStatus, isDirty, error: autoError, lastSavedAt, flush, resetBaseline } = useAutoSaveForm({
    data: formState,
    persist: persistRiskGoals,
    // Provide determineStatus so status can resolve even if persist returns void in future changes.
    determineStatus: deriveStatus,
    onStatusResolved: onStatusChange,
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

  const mapPayloadToState = useCallback((payload: RiskGoalsProfilePayload): RiskGoalsProfilePayload => {
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
      riskTolerance: typeof payload.riskTolerance === 'number' ? payload.riskTolerance : undefined,
      targetRetirementDate: payload.targetRetirementDate ? payload.targetRetirementDate.slice(0, 10) : undefined,
      passiveIncomeGoal: typeof payload.passiveIncomeGoal === 'number' ? payload.passiveIncomeGoal : undefined,
      liquidityBufferMonths: typeof payload.liquidityBufferMonths === 'number' ? payload.liquidityBufferMonths : undefined,
      emergencyFundTarget: typeof payload.emergencyFundTarget === 'number' ? payload.emergencyFundTarget : undefined,
      optOut: undefined,
    };
  }, []);

  useSectionHydration({
    sectionKey: 'risk-goals',
    userId,
    fetcher: fetchRiskGoalsProfile,
    mapPayloadToState,
    applyState: setFormState,
    resetBaseline,
  });

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

        {autoStatus === 'error' && errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Typography variant="caption" color="text.secondary">
          Autosave keeps this section in sync.
        </Typography>
      </Stack>
    </Box>
  );
}
