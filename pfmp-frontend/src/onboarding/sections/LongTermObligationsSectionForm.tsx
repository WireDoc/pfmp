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
  upsertLongTermObligationsProfile,
  type FinancialProfileSectionStatusValue,
  type LongTermObligationsProfilePayload,
  type LongTermObligationPayload,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type LongTermObligationsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type ObligationFormState = {
  id: string;
  obligationName: string;
  obligationType: string;
  targetDate: string;
  estimatedCost: string;
  fundsAllocated: string;
  fundingStatus: string;
  isCritical: boolean;
  notes: string;
};

const OBLIGATION_TYPE_OPTIONS = [
  { value: 'education', label: 'Education' },
  { value: 'housing', label: 'Housing / relocation' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'medical', label: 'Medical / care' },
  { value: 'wedding', label: 'Wedding / celebration' },
  { value: 'business', label: 'Business investment' },
  { value: 'vacation', label: 'Major travel / sabbatical' },
  { value: 'other', label: 'Other milestone' },
];

const FUNDING_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'saving', label: 'Saving in progress' },
  { value: 'funded', label: 'Fully funded' },
  { value: 'on-hold', label: 'On hold' },
];

const DEFAULT_OBLIGATION: ObligationFormState = {
  id: 'obligation-1',
  obligationName: '',
  obligationType: 'other',
  targetDate: '',
  estimatedCost: '',
  fundsAllocated: '',
  fundingStatus: 'planning',
  isCritical: false,
  notes: '',
};

function createObligation(index: number): ObligationFormState {
  return { ...DEFAULT_OBLIGATION, id: `obligation-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadObligations(obligations: ObligationFormState[]): LongTermObligationPayload[] {
  const payloads: LongTermObligationPayload[] = [];

  obligations.forEach((item) => {
    const hasContent =
      item.obligationName.trim() !== '' ||
      item.estimatedCost.trim() !== '' ||
      item.fundsAllocated.trim() !== '' ||
      item.targetDate.trim() !== '' ||
      item.notes.trim() !== '' ||
      item.isCritical ||
      item.fundingStatus !== 'planning';

    if (!hasContent) {
      return;
    }

    payloads.push({
      obligationName: item.obligationName.trim() || null,
      obligationType: item.obligationType || 'other',
      targetDate: item.targetDate ? new Date(item.targetDate).toISOString() : null,
      estimatedCost: parseNumber(item.estimatedCost) ?? null,
      fundsAllocated: parseNumber(item.fundsAllocated) ?? null,
      fundingStatus: item.fundingStatus || null,
      isCritical: item.isCritical ?? false,
      notes: item.notes.trim() || null,
    });
  });

  return payloads;
}

export default function LongTermObligationsSectionForm({
  userId,
  onStatusChange,
  currentStatus,
}: LongTermObligationsSectionFormProps) {
  const [obligations, setObligations] = useState<ObligationFormState[]>([createObligation(1)]);
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canRemoveRows = obligations.length > 1;
  const payloadObligations = useMemo(() => buildPayloadObligations(obligations), [obligations]);

  const handleObligationChange = <K extends keyof ObligationFormState>(
    id: string,
    key: K,
    value: ObligationFormState[K],
  ) => {
    setObligations((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleAddObligation = () => {
    setObligations((prev) => [...prev, createObligation(prev.length + 1)]);
  };

  const handleRemoveObligation = (id: string) => {
    setObligations((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [createObligation(1)];
    });
  };

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
    if (checked) {
      setSaveState('idle');
    }
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadObligations.length === 0) {
        throw new Error('List at least one obligation or choose to revisit later.');
      }

      const payload: LongTermObligationsProfilePayload = optedOut
        ? {
            obligations: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            obligations: payloadObligations,
            optOut: undefined,
          };

      await upsertLongTermObligationsProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save long-term obligations section', error);
      const message = error instanceof Error ? error.message : 'We could not save this section. Please try again.';
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
    >
      <Stack spacing={3} sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Switch checked={optedOut} onChange={(event) => handleOptOutToggle(event.target.checked)} color="primary" />}
          label="I don’t have long-term obligations right now"
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
            {obligations.map((item, index) => (
              <Box
                key={item.id}
                sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, position: 'relative', background: '#f9fbff' }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Obligation name"
                        placeholder="e.g. Renovation reserve"
                        value={item.obligationName}
                        onChange={(event) => handleObligationChange(item.id, 'obligationName', event.target.value)}
                        fullWidth
                      />
                      <FormControl fullWidth>
                        <InputLabel id={`${item.id}-type-label`}>Category</InputLabel>
                        <Select
                          labelId={`${item.id}-type-label`}
                          label="Category"
                          value={item.obligationType}
                          onChange={(event) => handleObligationChange(item.id, 'obligationType', event.target.value)}
                        >
                          {OBLIGATION_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="date"
                        label="Target date"
                        InputLabelProps={{ shrink: true }}
                        value={item.targetDate}
                        onChange={(event) => handleObligationChange(item.id, 'targetDate', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Estimated cost ($)"
                        value={item.estimatedCost}
                        onChange={(event) => handleObligationChange(item.id, 'estimatedCost', event.target.value)}
                        inputProps={{ min: 0, step: 100 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Funds allocated ($)"
                        value={item.fundsAllocated}
                        onChange={(event) => handleObligationChange(item.id, 'fundsAllocated', event.target.value)}
                        inputProps={{ min: 0, step: 100 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel id={`${item.id}-status-label`}>Funding status</InputLabel>
                        <Select
                          labelId={`${item.id}-status-label`}
                          label="Funding status"
                          value={item.fundingStatus}
                          onChange={(event) => handleObligationChange(item.id, 'fundingStatus', event.target.value)}
                        >
                          {FUNDING_STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.isCritical}
                            onChange={(event) => handleObligationChange(item.id, 'isCritical', event.target.checked)}
                          />
                        }
                        label="Critical milestone"
                      />
                    </Stack>

                    <TextField
                      sx={{ mt: 2 }}
                      label="Notes (optional)"
                      value={item.notes}
                      onChange={(event) => handleObligationChange(item.id, 'notes', event.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Box>
                  {canRemoveRows && (
                    <Tooltip title="Remove obligation">
                      <IconButton onClick={() => handleRemoveObligation(item.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Obligation {index + 1}
                </Typography>
              </Box>
            ))}

            <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddObligation} sx={{ alignSelf: 'flex-start' }}>
              Add another obligation
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
            data-testid="long-term-obligations-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Log upcoming milestones so we can track funding readiness and prompt next steps.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
