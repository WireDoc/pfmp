import { useCallback, useMemo, useState, useEffect } from 'react';
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
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { fetchInsurancePoliciesProfile, upsertInsurancePoliciesProfile, type FinancialProfileSectionStatusValue, type InsurancePoliciesProfilePayload, type InsurancePolicyPayload } from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';


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
  const payloads: InsurancePolicyPayload[] = [];

  policies.forEach((policy) => {
    const hasValues =
      policy.policyName.trim() !== '' ||
      policy.carrier.trim() !== '' ||
      policy.coverageAmount.trim() !== '' ||
      policy.premiumAmount.trim() !== '' ||
      policy.renewalDate.trim() !== '' ||
      policy.recommendedCoverage.trim() !== '' ||
      policy.isAdequateCoverage;

    if (!hasValues) {
      return;
    }

    payloads.push({
      policyType: policy.policyType || 'term-life',
      carrier: policy.carrier.trim() || null,
      policyName: policy.policyName.trim() || null,
      coverageAmount: parseNumber(policy.coverageAmount) ?? null,
      premiumAmount: parseNumber(policy.premiumAmount) ?? null,
      premiumFrequency: policy.premiumFrequency || null,
      renewalDate: policy.renewalDate ? new Date(policy.renewalDate).toISOString() : null,
      isAdequateCoverage: policy.isAdequateCoverage,
      recommendedCoverage: parseNumber(policy.recommendedCoverage) ?? null,
    });
  });

  return payloads;
}

export default function InsuranceSectionForm({ userId, onStatusChange, currentStatus }: InsuranceSectionFormProps) {
  const [policies, setPolicies] = useState<InsurancePolicyFormState[]>([createPolicy(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  // Manual submit removed (autosave handles persistence and error state)

  const payloadPolicies = useMemo(() => buildPayloadPolicies(policies), [policies]);
  const canRemovePolicies = policies.length > 1;

  type HydratedState = {
    policies: InsurancePolicyFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const hasPolicyContent = useCallback((items: InsurancePolicyFormState[]) => {
    return items.some((policy) =>
      policy.policyName.trim() !== '' ||
      policy.carrier.trim() !== '' ||
      policy.coverageAmount.trim() !== '' ||
      policy.premiumAmount.trim() !== '' ||
      policy.renewalDate.trim() !== '' ||
      policy.recommendedCoverage.trim() !== '' ||
      policy.isAdequateCoverage,
    );
  }, []);

  const mapPayloadToState = useCallback((payload: InsurancePoliciesProfilePayload): HydratedState => {
    const hydratedPolicies = (payload.policies ?? []).map((policy, index) => ({
      id: `policy-${index + 1}`,
      policyType: policy.policyType ?? 'term-life',
      carrier: policy.carrier ?? '',
      policyName: policy.policyName ?? '',
      coverageAmount: policy.coverageAmount != null ? String(policy.coverageAmount) : '',
      premiumAmount: policy.premiumAmount != null ? String(policy.premiumAmount) : '',
      premiumFrequency: policy.premiumFrequency ?? 'annual',
      renewalDate: policy.renewalDate ? policy.renewalDate.slice(0, 10) : '',
      isAdequateCoverage: policy.isAdequateCoverage ?? false,
      recommendedCoverage: policy.recommendedCoverage != null ? String(policy.recommendedCoverage) : '',
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      policies: hydratedPolicies.length > 0 ? hydratedPolicies : [createPolicy(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ policies: nextPolicies, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      const hasMeaningfulData =
        nextOptedOut || (nextReason?.trim()?.length ?? 0) > 0 || hasPolicyContent(nextPolicies);

      if (!hasMeaningfulData) {
        return { policies, optedOut, optOutReason };
      }

      setPolicies(nextPolicies);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');

      return {
        policies: nextPolicies,
        optedOut: nextOptedOut,
        optOutReason: nextReason ?? '',
      };
    },
    [hasPolicyContent, optOutReason, optedOut, policies],
  );

  useSectionHydration({
    sectionKey: 'insurance',
    userId,
    fetcher: fetchInsurancePoliciesProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

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

  function buildPayload(): InsurancePoliciesProfilePayload {
    if (optedOut) {
      return {
        policies: [],
        optOut: {
          isOptedOut: true,
          reason: optOutReason.trim() || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      };
    }
    return { policies: payloadPolicies, optOut: undefined };
  }

  function deriveStatus(payload: InsurancePoliciesProfilePayload): FinancialProfileSectionStatusValue {
    if (payload.optOut?.isOptedOut) return 'opted_out';
    return payload.policies.length > 0 ? 'completed' : 'needs_info';
  }

  const persistInsurance = useCallback(async (draft: InsurancePoliciesProfilePayload) => {
    if (!draft.optOut?.isOptedOut && draft.policies.length === 0) {
      throw new Error('Add at least one policy or opt out of this section.');
    }
    await upsertInsurancePoliciesProfile(userId, draft);
    return deriveStatus(draft);
  }, [userId]);

  const { status: autoStatus, isDirty, error: autoError, lastSavedAt, flush } = useAutoSaveForm<InsurancePoliciesProfilePayload>({
    data: buildPayload(),
    persist: persistInsurance,
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

  const handleOptOutToggle = (checked: boolean) => {
    setOptedOut(checked);
  };

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void flush(); }}>
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

            <button
              type="button"
              onClick={handleAddPolicy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: '#fff',
                border: '1px solid #90caf9',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#1565c0',
              }}
            >
              <AddIcon style={{ fontSize: 18 }} /> Add another policy
            </button>
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
        <Typography variant="body2" color="text.secondary">Capture coverage and premiums so we can surface protection gaps.</Typography>
      </Stack>
    </Box>
  );
}
