import { useCallback, useMemo, useState } from 'react';
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
  fetchInvestmentAccountsProfile,
  upsertInvestmentAccountsProfile,
  type FinancialProfileSectionStatusValue,
  type InvestmentAccountPayload,
  type InvestmentAccountsProfilePayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type InvestmentAccountsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type InvestmentAccountFormState = {
  id: string;
  accountName: string;
  institution: string;
  accountCategory: string;
  assetClass: string;
  currentValue: string;
  costBasis: string;
  contributionRatePercent: string;
  isTaxAdvantaged: boolean;
  lastContributionDate: string;
};

const DEFAULT_ACCOUNT: InvestmentAccountFormState = {
  id: 'investment-1',
  accountName: '',
  institution: '',
  accountCategory: 'brokerage',
  assetClass: '',
  currentValue: '',
  costBasis: '',
  contributionRatePercent: '',
  isTaxAdvantaged: false,
  lastContributionDate: '',
};

const INVESTMENT_CATEGORY_OPTIONS = [
  { value: 'brokerage', label: 'Taxable brokerage' },
  { value: '401k', label: '401(k) / 403(b)' },
  { value: 'ira', label: 'Traditional IRA' },
  { value: 'roth-ira', label: 'Roth IRA' },
  { value: 'hsa', label: 'HSA' },
  { value: '529', label: '529 college savings' },
  { value: 'crypto', label: 'Crypto / digital assets' },
  { value: 'precious-metals', label: 'Precious metals' },
];

function createAccount(index: number): InvestmentAccountFormState {
  return { ...DEFAULT_ACCOUNT, id: `investment-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadAccounts(accounts: InvestmentAccountFormState[]): InvestmentAccountPayload[] {
  const payloads: InvestmentAccountPayload[] = [];

  accounts.forEach((account) => {
    const hasValues =
      account.accountName.trim() !== '' ||
      account.institution.trim() !== '' ||
      account.assetClass.trim() !== '' ||
      account.currentValue.trim() !== '' ||
      account.costBasis.trim() !== '';

    if (!hasValues) {
      return;
    }

    payloads.push({
      accountName: account.accountName.trim() || null,
      institution: account.institution.trim() || null,
      accountCategory: account.accountCategory.trim() || 'brokerage',
      assetClass: account.assetClass.trim() || null,
      currentValue: parseNumber(account.currentValue) ?? null,
      costBasis: parseNumber(account.costBasis) ?? null,
      contributionRatePercent: parseNumber(account.contributionRatePercent) ?? null,
      isTaxAdvantaged: account.isTaxAdvantaged,
      lastContributionDate: account.lastContributionDate ? new Date(account.lastContributionDate).toISOString() : null,
    });
  });

  return payloads;
}

export default function InvestmentAccountsSectionForm({ userId, onStatusChange, currentStatus }: InvestmentAccountsSectionFormProps) {
  const [accounts, setAccounts] = useState<InvestmentAccountFormState[]>([createAccount(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payloadAccounts = useMemo(() => buildPayloadAccounts(accounts), [accounts]);
  const canRemoveAccounts = accounts.length > 1;

  type HydratedState = {
    accounts: InvestmentAccountFormState[];
    optedOut: boolean;
    optOutReason: string;
  };

  const mapPayloadToState = useCallback((payload: InvestmentAccountsProfilePayload): HydratedState => {
    const hydratedAccounts = (payload.accounts ?? []).map((account, index) => ({
      id: `investment-${index + 1}`,
      accountName: account.accountName ?? '',
      institution: account.institution ?? '',
      accountCategory: account.accountCategory ?? 'brokerage',
      assetClass: account.assetClass ?? '',
      currentValue: account.currentValue != null ? String(account.currentValue) : '',
      costBasis: account.costBasis != null ? String(account.costBasis) : '',
      contributionRatePercent: account.contributionRatePercent != null ? String(account.contributionRatePercent) : '',
      isTaxAdvantaged: account.isTaxAdvantaged ?? false,
      lastContributionDate: account.lastContributionDate ? account.lastContributionDate.slice(0, 10) : '',
    }));

    const optedOutState = payload.optOut?.isOptedOut === true;

    return {
      accounts: hydratedAccounts.length > 0 ? hydratedAccounts : [createAccount(1)],
      optedOut: optedOutState,
      optOutReason: payload.optOut?.reason ?? '',
    };
  }, []);

  const applyHydratedState = useCallback(
    ({ accounts: nextAccounts, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
      setAccounts(nextAccounts);
      setOptedOut(nextOptedOut);
      setOptOutReason(nextReason ?? '');
    },
    [],
  );

  useSectionHydration({
    sectionKey: 'investments',
    userId,
    fetcher: fetchInvestmentAccountsProfile,
    mapPayloadToState,
    applyState: applyHydratedState,
  });

  const handleAccountChange = <K extends keyof InvestmentAccountFormState>(id: string, key: K, value: InvestmentAccountFormState[K]) => {
    setAccounts((prev) => prev.map((account) => (account.id === id ? { ...account, [key]: value } : account)));
  };

  const handleAddAccount = () => {
    setAccounts((prev) => [...prev, createAccount(prev.length + 1)]);
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => {
      const remaining = prev.filter((account) => account.id !== id);
      return remaining.length > 0 ? remaining : [createAccount(1)];
    });
  };

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadAccounts.length === 0) {
        throw new Error('Add at least one investment account or opt out of this section.');
      }

      const payload: InvestmentAccountsProfilePayload = optedOut
        ? {
            accounts: [],
            optOut: {
              isOptedOut: true,
              reason: optOutReason.trim() || undefined,
              acknowledgedAt: new Date().toISOString(),
            },
          }
        : {
            accounts: payloadAccounts,
            optOut: undefined,
          };

      await upsertInvestmentAccountsProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save investment accounts section', error);
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
          label="I don’t have non-TSP investment accounts"
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
            {accounts.map((account, index) => (
              <Box key={account.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, background: '#f9fbff', position: 'relative' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Account name"
                        placeholder="e.g. Schwab taxable"
                        value={account.accountName}
                        onChange={(event) => handleAccountChange(account.id, 'accountName', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Institution"
                        placeholder="Brokerage or custodian"
                        value={account.institution}
                        onChange={(event) => handleAccountChange(account.id, 'institution', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel id={`${account.id}-category-label`}>Account category</InputLabel>
                        <Select
                          labelId={`${account.id}-category-label`}
                          label="Account category"
                          value={account.accountCategory}
                          onChange={(event) => handleAccountChange(account.id, 'accountCategory', event.target.value)}
                        >
                          {INVESTMENT_CATEGORY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Asset class focus"
                        placeholder="e.g. Index funds, target date"
                        value={account.assetClass}
                        onChange={(event) => handleAccountChange(account.id, 'assetClass', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Current balance ($)"
                        value={account.currentValue}
                        onChange={(event) => handleAccountChange(account.id, 'currentValue', event.target.value)}
                        inputProps={{ min: 0, step: 100 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Cost basis ($)"
                        value={account.costBasis}
                        onChange={(event) => handleAccountChange(account.id, 'costBasis', event.target.value)}
                        inputProps={{ min: 0, step: 100 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Contribution rate (%)"
                        value={account.contributionRatePercent}
                        onChange={(event) => handleAccountChange(account.id, 'contributionRatePercent', event.target.value)}
                        inputProps={{ min: 0, step: 0.5 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="date"
                        label="Last contribution"
                        InputLabelProps={{ shrink: true }}
                        value={account.lastContributionDate}
                        onChange={(event) => handleAccountChange(account.id, 'lastContributionDate', event.target.value)}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={account.isTaxAdvantaged}
                            onChange={(event) => handleAccountChange(account.id, 'isTaxAdvantaged', event.target.checked)}
                          />
                        }
                        label="Tax-advantaged"
                      />
                    </Stack>
                  </Box>
                  {canRemoveAccounts && (
                    <Tooltip title="Remove account">
                      <IconButton onClick={() => handleRemoveAccount(account.id)} size="small" sx={{ mt: -1, color: '#c62828' }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Divider sx={{ mt: 3 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>
                  Account {index + 1}
                </Typography>
              </Box>
            ))}

            <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddAccount} sx={{ alignSelf: 'flex-start' }}>
              Add another investment account
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
            data-testid="investments-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Capture balances so your dashboard can chart allocation and net worth.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
