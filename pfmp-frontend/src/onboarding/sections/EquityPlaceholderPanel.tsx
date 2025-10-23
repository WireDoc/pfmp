import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import {
  upsertEquityInterest,
  type EquityInterestPayload,
  type FinancialProfileSectionStatusValue,
} from '../../services/financialProfileApi';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

type EquityPlaceholderPanelProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

export default function EquityPlaceholderPanel({ userId, onStatusChange, currentStatus }: EquityPlaceholderPanelProps) {
  const [formState, setFormState] = useState<EquityInterestPayload>(() => {
    if (currentStatus === 'opted_out') {
      return {
        isInterestedInTracking: false,
        notes: null,
        optOut: {
          isOptedOut: true,
          reason: undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return {
      isInterestedInTracking: true,
      notes: null,
      optOut: undefined,
    };
  });

  const optedOut = useMemo(() => formState.optOut?.isOptedOut === true, [formState.optOut]);

  const persistEquity = useCallback(
    async (draft: EquityInterestPayload) => {
      const payload: EquityInterestPayload = draft.optOut?.isOptedOut
        ? {
            isInterestedInTracking: false,
            notes: (draft.optOut.reason?.trim() || null) ?? null,
            optOut: {
              isOptedOut: true,
              reason: draft.optOut.reason?.trim() || undefined,
              acknowledgedAt: draft.optOut.acknowledgedAt ?? new Date().toISOString(),
            },
          }
        : {
            isInterestedInTracking: draft.isInterestedInTracking,
            notes: draft.notes?.trim() || null,
            optOut: undefined,
          };
      await upsertEquityInterest(userId, payload);
      return draft.optOut?.isOptedOut ? 'opted_out' : 'completed';
    },
    [userId],
  );

  const { status: autoStatus, isDirty, error: autoError, lastSavedAt, flush } = useAutoSaveForm({
    data: formState,
    persist: persistEquity,
    determineStatus: (draft) => (draft.optOut?.isOptedOut ? 'opted_out' : 'completed'),
    onStatusResolved: onStatusChange,
  });

  // Auto-persist on first mount if section is still 'needs_info'
  useEffect(() => {
    if (currentStatus === 'needs_info') {
      void flush();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const errorMessage = autoError instanceof Error ? autoError.message : autoError ? 'We could not save your preference yet.' : null;

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void flush();
      }}
      sx={{ mt: 3 }}
    >
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
            Autosave keeps this section in sync.
          </Typography>
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={autoError} />
        </Stack>
        <Box sx={{ borderRadius: 3, border: '1px dashed #90caf9', background: '#f3f8ff', p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Equity & private investments are on deck
          </Typography>
          <Typography variant="body1" sx={{ color: '#455a64', lineHeight: 1.7 }}>
            We’re finalizing support for RSUs, stock options, and private or closely-held business ownership. Capture your interest now and
            we’ll notify you when the dedicated experience is live.
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={optedOut}
              onChange={(event) =>
                setFormState((prev) =>
                  event.target.checked
                    ? {
                        isInterestedInTracking: false,
                        notes: null,
                        optOut: {
                          isOptedOut: true,
                          reason: prev.optOut?.reason ?? undefined,
                          acknowledgedAt: prev.optOut?.acknowledgedAt ?? new Date().toISOString(),
                        },
                      }
                    : {
                        isInterestedInTracking: true,
                        notes: prev.notes ?? null,
                        optOut: undefined,
                      },
                )
              }
              color="primary"
            />
          }
          label="I don’t need this yet"
        />

        {optedOut ? (
          <TextField
            label="Add context (optional)"
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
            placeholder="e.g. No equity compensation today"
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formState.isInterestedInTracking}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isInterestedInTracking: event.target.checked,
                    }))
                  }
                  color="primary"
                />
              }
              label={formState.isInterestedInTracking ? 'Yes, let me know when this launches' : 'No, I’m not interested right now'}
            />
            <TextField
              label="Anything we should know?"
              value={formState.notes ?? ''}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              placeholder="Current grants, strike prices, private investments, etc."
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        )}

        {autoStatus === 'error' && errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Typography variant="body2" color="text.secondary">
          We’ll treat this section as complete so you can keep moving today.
        </Typography>
      </Stack>
    </Box>
  );
}
