import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
  upsertIncomeStreamsProfile,
  type FinancialProfileSectionStatusValue,
  type IncomeStreamsProfilePayload,
  type IncomeStreamPayload,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

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
  return streams
    .map((stream) => {
      const hasValues =
        stream.name.trim() !== '' ||
        stream.monthlyAmount.trim() !== '' ||
        stream.annualAmount.trim() !== '' ||
        stream.startDate.trim() !== '' ||
        stream.endDate.trim() !== '' ||
        stream.isGuaranteed ||
        stream.isActive === false;

      if (!hasValues) {
        return null;
      }

      return {
        name: stream.name.trim() || null,
        incomeType: stream.incomeType || 'salary',
        monthlyAmount: parseNumber(stream.monthlyAmount) ?? null,
        annualAmount: parseNumber(stream.annualAmount) ?? null,
        isGuaranteed: stream.isGuaranteed,
        startDate: stream.startDate ? new Date(stream.startDate).toISOString() : null,
        endDate: stream.endDate ? new Date(stream.endDate).toISOString() : null,
        isActive: stream.isActive,
      } satisfies IncomeStreamPayload;
    })
    .filter((stream): stream is IncomeStreamPayload => stream !== null);
}

export default function IncomeSectionForm({ userId, onStatusChange, currentStatus }: IncomeSectionFormProps) {
  const [streams, setStreams] = useState<IncomeStreamFormState[]>([createStream(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payloadStreams = useMemo(() => buildPayloadStreams(streams), [streams]);
  const canRemoveStreams = streams.length > 1;

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

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadStreams.length === 0) {
        throw new Error('Add at least one income stream or opt out of this section.');
      }

      const payload: IncomeStreamsProfilePayload = optedOut
        ? {
            streams: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            streams: payloadStreams,
            optOut: undefined,
          };

      await upsertIncomeStreamsProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save income section', error);
      const message = error instanceof Error ? error.message : 'We could not save this section. Please try again.';
      setErrorMessage(message);
      setSaveState('error');
    }
  };

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (checked) {
      setSaveState('idle');
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

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {saveState === 'success' && <Alert severity="success">Section saved.</Alert>}

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleSubmit()}
            disabled={saveState === 'saving'}
            data-testid="income-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Tell us about recurring income so your cashflow insights stay current.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
