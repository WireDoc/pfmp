import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  fetchBenefitsProfile,
  upsertBenefitsProfile,
  type BenefitCoveragePayload,
  type BenefitsProfilePayload,
  type FinancialProfileSectionStatusValue,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type BenefitsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type BenefitFormState = {
  id: string;
  benefitType: string;
  provider: string;
  isEnrolled: boolean;
  employerContributionPercent: string;
  monthlyCost: string;
  notes: string;
};

const BENEFIT_TYPE_OPTIONS = [
  { value: 'health', label: 'Health insurance' },
  { value: 'dental', label: 'Dental / vision' },
  { value: 'retirement-match', label: 'Employer retirement match' },
  { value: 'hsa-fsa', label: 'HSA / FSA contributions' },
  { value: 'life-disability', label: 'Group life / disability' },
  { value: 'education', label: 'Tuition / education benefits' },
  { value: 'wellness', label: 'Wellness / perks' },
  { value: 'va-benefit', label: 'Federal / VA programs' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_BENEFIT: BenefitFormState = {
  id: 'benefit-1',
  benefitType: 'health',
  provider: '',
  isEnrolled: true,
  employerContributionPercent: '',
  monthlyCost: '',
  notes: '',
};

function createBenefit(index: number): BenefitFormState {
  return { ...DEFAULT_BENEFIT, id: `benefit-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayload(benefits: BenefitFormState[]): BenefitCoveragePayload[] {
  const payloads: BenefitCoveragePayload[] = [];

  benefits.forEach((benefit) => {
    const hasValue =
      benefit.provider.trim() !== '' ||
      benefit.monthlyCost.trim() !== '' ||
      benefit.employerContributionPercent.trim() !== '' ||
      benefit.notes.trim() !== '';

    if (!hasValue) {
      return;
    }

    payloads.push({
      benefitType: benefit.benefitType || 'other',
      provider: benefit.provider.trim() || null,
      isEnrolled: benefit.isEnrolled,
      employerContributionPercent: parseNumber(benefit.employerContributionPercent) ?? null,
      monthlyCost: parseNumber(benefit.monthlyCost) ?? null,
      notes: benefit.notes.trim() || null,
    });
  });

  return payloads;
}

export default function BenefitsSectionForm({ userId, onStatusChange, currentStatus }: BenefitsSectionFormProps) {
  const [benefits, setBenefits] = useState<BenefitFormState[]>([createBenefit(1)]);
  const [optedOut, setOptedOut] = useState(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payloadBenefits = useMemo(() => buildPayload(benefits), [benefits]);
  const canRemoveRows = benefits.length > 1;

  type HydratedState = {
    benefits: BenefitFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: BenefitsProfilePayload): HydratedState => {
    const hydratedBenefits = (payload.benefits ?? []).map((benefit, index) => ({
      id: `benefit-${index + 1}`,
      benefitType: benefit.benefitType ?? 'other',
      provider: benefit.provider ?? '',
      isEnrolled: benefit.isEnrolled ?? true,
      employerContributionPercent: benefit.employerContributionPercent != null ? String(benefit.employerContributionPercent) : '',
      monthlyCost: benefit.monthlyCost != null ? String(benefit.monthlyCost) : '',
      notes: benefit.notes ?? '',
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      benefits: hydratedBenefits.length > 0 ? hydratedBenefits : [createBenefit(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ benefits: nextBenefits, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      setBenefits(nextBenefits);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'benefits',
    userId,
    fetcher: fetchBenefitsProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleBenefitChange = <K extends keyof BenefitFormState>(id: string, key: K, value: BenefitFormState[K]) => {
    setBenefits((prev) => prev.map((benefit) => (benefit.id === id ? { ...benefit, [key]: value } : benefit)));
  };

  const handleAddBenefit = () => {
    setBenefits((prev) => [...prev, createBenefit(prev.length + 1)]);
  };

  const handleRemoveBenefit = (id: string) => {
    setBenefits((prev) => {
      const remaining = prev.filter((benefit) => benefit.id !== id);
      return remaining.length > 0 ? remaining : [createBenefit(1)];
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
      if (!optedOut && payloadBenefits.length === 0) {
        throw new Error('Capture at least one benefit or opt out.');
      }

      const payload: BenefitsProfilePayload = optedOut
        ? {
            benefits: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            benefits: payloadBenefits,
            optOut: undefined,
          };

      await upsertBenefitsProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save benefits section', error);
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
          label="I’ll review benefits later"
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
            {benefits.map((benefit, index) => (
              <Box key={benefit.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#f8fbff', position: 'relative' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id={`${benefit.id}-benefit-type-label`}>Benefit type</InputLabel>
                        <Select
                          labelId={`${benefit.id}-benefit-type-label`}
                          label="Benefit type"
                          value={benefit.benefitType}
                          onChange={(event) => handleBenefitChange(benefit.id, 'benefitType', event.target.value)}
                        >
                          {BENEFIT_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Provider"
                        placeholder="Employer, agency, provider"
                        value={benefit.provider}
                        onChange={(event) => handleBenefitChange(benefit.id, 'provider', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={benefit.isEnrolled} onChange={(event) => handleBenefitChange(benefit.id, 'isEnrolled', event.target.checked)} color="primary" />}
                        label={benefit.isEnrolled ? 'Enrolled' : 'Not enrolled'}
                      />
                      <TextField
                        type="number"
                        label="Employer contribution (%)"
                        value={benefit.employerContributionPercent}
                        onChange={(event) => handleBenefitChange(benefit.id, 'employerContributionPercent', event.target.value)}
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Monthly cost / premium ($)"
                        value={benefit.monthlyCost}
                        onChange={(event) => handleBenefitChange(benefit.id, 'monthlyCost', event.target.value)}
                        inputProps={{ min: 0, step: 5 }}
                        fullWidth
                      />
                    </Stack>

                    <TextField
                      sx={{ mt: 2 }}
                      label="Notes"
                      value={benefit.notes}
                      onChange={(event) => handleBenefitChange(benefit.id, 'notes', event.target.value)}
                      placeholder="Eligible dependents, enrollment windows, unused perks"
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Box>
                  {canRemoveRows && (
                    <Tooltip title="Remove benefit">
                      <IconButton onClick={() => handleRemoveBenefit(benefit.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Benefit {index + 1}
                </Typography>
              </Box>
            ))}

            <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddBenefit} sx={{ alignSelf: 'flex-start' }}>
              Add another benefit
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
            data-testid="benefits-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Document employer and federal perks so we can flag unused value.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
