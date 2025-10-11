import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import {
  upsertEquityInterest,
  type EquityInterestPayload,
  type FinancialProfileSectionStatusValue,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type EquityPlaceholderPanelProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

export default function EquityPlaceholderPanel({ userId, onStatusChange, currentStatus }: EquityPlaceholderPanelProps) {
  const [wantsTracking, setWantsTracking] = useState(true);
  const [notes, setNotes] = useState('');
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      const payload: EquityInterestPayload = optedOut
        ? {
            isInterestedInTracking: false,
            notes: optOutReason.trim() || null,
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            isInterestedInTracking: wantsTracking,
            notes: notes.trim() || null,
            optOut: undefined,
          };

      await upsertEquityInterest(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save equity placeholder', error);
      const message = error instanceof Error ? error.message : 'We could not save your preference yet. Please try again soon.';
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
      sx={{ mt: 3 }}
    >
      <Stack spacing={3}>
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
          control={<Switch checked={optedOut} onChange={(event) => setOptedOut(event.target.checked)} color="primary" />}
          label="I don’t need this yet"
        />

        {optedOut ? (
          <TextField
            label="Add context (optional)"
            value={optOutReason}
            onChange={(event) => setOptOutReason(event.target.value)}
            placeholder="e.g. No equity compensation today"
            multiline
            minRows={3}
            fullWidth
          />
        ) : (
          <Stack spacing={3}>
            <FormControlLabel
              control={<Switch checked={wantsTracking} onChange={(event) => setWantsTracking(event.target.checked)} color="primary" />}
              label={wantsTracking ? 'Yes, let me know when this launches' : 'No, I’m not interested right now'}
            />
            <TextField
              label="Anything we should know?"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Current grants, strike prices, private investments, etc."
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        )}

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {saveState === 'success' && <Alert severity="success">Preference saved.</Alert>}

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleSubmit()}
            disabled={saveState === 'saving'}
            data-testid="equity-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save acknowledgment'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            We’ll treat this section as complete so you can keep moving today.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
