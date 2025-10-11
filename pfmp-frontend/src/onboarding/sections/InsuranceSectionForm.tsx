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
  upsertInsurancePoliciesProfile,
  type FinancialProfileSectionStatusValue,
  type InsurancePoliciesProfilePayload,
  type InsurancePolicyPayload,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type InsuranceSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type InsurancePolicyFormState = {
  id: string;
  policyType: string;
  carrier: string;
  policyName: string;
  coverageAmount: string;
  premiumAmount: string;
  premiumFrequency: string;
  renewalDate: string;
  isAdequateCoverage: boolean;
  recommendedCoverage: string;
};

const POLICY_TYPE_OPTIONS = [
  { value: 'term-life', label: 'Term life' },
  { value: 'whole-life', label: 'Whole life' },
  { value: 'disability', label: 'Disability' },
  { value: 'long-term-care', label: 'Long-term care' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'auto', label: 'Auto' },
  { value: 'homeowners', label: 'Homeowners' },
  { value: 'renters', label: 'Renters' },
];

const PREMIUM_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
];

const DEFAULT_POLICY: InsurancePolicyFormState = {
  id: 'policy-1',
  policyType: 'term-life',
  carrier: '',
  policyName: '',
  coverageAmount: '',
  premiumAmount: '',
  premiumFrequency: 'annual',
  renewalDate: '',
  isAdequateCoverage: false,
  recommendedCoverage: '',
};

function createPolicy(index: number): InsurancePolicyFormState {
  return { ...DEFAULT_POLICY, id: `policy-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadPolicies(policies: InsurancePolicyFormState[]): InsurancePolicyPayload[] {
  return policies
    .map((policy) => {
      const hasValues =
        policy.policyName.trim() !== '' ||
        policy.carrier.trim() !== '' ||
        policy.coverageAmount.trim() !== '' ||
        policy.premiumAmount.trim() !== '' ||
        policy.renewalDate.trim() !== '' ||
        policy.recommendedCoverage.trim() !== '' ||
        policy.isAdequateCoverage;

      if (!hasValues) {
        return null;
      }

      return {
        policyType: policy.policyType || 'term-life',
        carrier: policy.carrier.trim() || null,
        policyName: policy.policyName.trim() || null,
        coverageAmount: parseNumber(policy.coverageAmount) ?? null,
        premiumAmount: parseNumber(policy.premiumAmount) ?? null,
        premiumFrequency: policy.premiumFrequency || null,
        renewalDate: policy.renewalDate ? new Date(policy.renewalDate).toISOString() : null,
        isAdequateCoverage: policy.isAdequateCoverage,
        recommendedCoverage: parseNumber(policy.recommendedCoverage) ?? null,
      } satisfies InsurancePolicyPayload;
    })
    .filter((policy): policy is InsurancePolicyPayload => policy !== null);
}

export default function InsuranceSectionForm({ userId, onStatusChange, currentStatus }: InsuranceSectionFormProps) {
  const [policies, setPolicies] = useState<InsurancePolicyFormState[]>([createPolicy(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payloadPolicies = useMemo(() => buildPayloadPolicies(policies), [policies]);
  const canRemovePolicies = policies.length > 1;

  const handlePolicyChange = <K extends keyof InsurancePolicyFormState>(id: string, key: K, value: InsurancePolicyFormState[K]) => {
    setPolicies((prev) => prev.map((policy) => (policy.id === id ? { ...policy, [key]: value } : policy)));
  };

  const handleAddPolicy = () => {
    setPolicies((prev) => [...prev, createPolicy(prev.length + 1)]);
  };

  const handleRemovePolicy = (id: string) => {
    setPolicies((prev) => {
      const remaining = prev.filter((policy) => policy.id !== id);
      return remaining.length > 0 ? remaining : [createPolicy(1)];
    });
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadPolicies.length === 0) {
        throw new Error('Add at least one policy or opt out of this section.');
      }

      const payload: InsurancePoliciesProfilePayload = optedOut
        ? {
            policies: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            policies: payloadPolicies,
            optOut: undefined,
          };

      await upsertInsurancePoliciesProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save insurance section', error);
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
          label="I don’t have insurance details to add"
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
            {policies.map((policy, index) => (
              <Box key={policy.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#f9fbff', position: 'relative' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id={`${policy.id}-type-label`}>Policy type</InputLabel>
                        <Select
                          labelId={`${policy.id}-type-label`}
                          label="Policy type"
                          value={policy.policyType}
                          onChange={(event) => handlePolicyChange(policy.id, 'policyType', event.target.value)}
                        >
                          {POLICY_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Carrier"
                        placeholder="Provider"
                        value={policy.carrier}
                        onChange={(event) => handlePolicyChange(policy.id, 'carrier', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        label="Policy name or number"
                        placeholder="e.g. Term Life 2040"
                        value={policy.policyName}
                        onChange={(event) => handlePolicyChange(policy.id, 'policyName', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Coverage amount ($)"
                        value={policy.coverageAmount}
                        onChange={(event) => handlePolicyChange(policy.id, 'coverageAmount', event.target.value)}
                        inputProps={{ min: 0, step: 1000 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Premium amount ($)"
                        value={policy.premiumAmount}
                        onChange={(event) => handlePolicyChange(policy.id, 'premiumAmount', event.target.value)}
                        inputProps={{ min: 0, step: 10 }}
                        fullWidth
                      />
                      <FormControl fullWidth>
                        <InputLabel id={`${policy.id}-frequency-label`}>Premium frequency</InputLabel>
                        <Select
                          labelId={`${policy.id}-frequency-label`}
                          label="Premium frequency"
                          value={policy.premiumFrequency}
                          onChange={(event) => handlePolicyChange(policy.id, 'premiumFrequency', event.target.value)}
                        >
                          {PREMIUM_FREQUENCY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        type="date"
                        label="Renewal date"
                        InputLabelProps={{ shrink: true }}
                        value={policy.renewalDate}
                        onChange={(event) => handlePolicyChange(policy.id, 'renewalDate', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Recommended coverage ($)"
                        value={policy.recommendedCoverage}
                        onChange={(event) => handlePolicyChange(policy.id, 'recommendedCoverage', event.target.value)}
                        inputProps={{ min: 0, step: 1000 }}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={policy.isAdequateCoverage}
                            onChange={(event) => handlePolicyChange(policy.id, 'isAdequateCoverage', event.target.checked)}
                          />
                        }
                        label="Coverage meets my needs"
                      />
                    </Stack>
                  </Box>
                  {canRemovePolicies && (
                    <Tooltip title="Remove policy">
                      <IconButton onClick={() => handleRemovePolicy(policy.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Policy {index + 1}
                </Typography>
              </Box>
            ))}

            <Button
              type="button"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddPolicy}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add another policy
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
            data-testid="insurance-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Capture coverage and premiums so we can surface protection gaps.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
