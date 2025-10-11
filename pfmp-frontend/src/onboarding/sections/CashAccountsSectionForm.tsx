import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Checkbox,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  upsertCashAccountsProfile,
  type FinancialProfileSectionStatusValue,
  type CashAccountsProfilePayload,
  type CashAccountPayload,
} from '../../services/financialProfileApi';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type CashAccountsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

type AccountFormState = {
  id: string;
  nickname: string;
  institution: string;
  accountType: string;
  balance: string;
  interestRateApr: string;
  isEmergencyFund: boolean;
  rateLastChecked: string;
};

const DEFAULT_ACCOUNT: AccountFormState = {
  id: 'account-1',
  nickname: '',
  institution: '',
  accountType: 'checking',
  balance: '',
  interestRateApr: '',
  isEmergencyFund: false,
  rateLastChecked: '',
};

function createAccount(index: number): AccountFormState {
  return { ...DEFAULT_ACCOUNT, id: `account-${index}` };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayloadAccounts(accounts: AccountFormState[]): CashAccountPayload[] {
  return accounts
    .map((account) => {
      const hasValues =
        account.nickname.trim() !== '' ||
        account.institution.trim() !== '' ||
        account.balance.trim() !== '' ||
        account.interestRateApr.trim() !== '';

      if (!hasValues) {
        return null;
      }

      return {
        nickname: account.nickname.trim() || null,
        institution: account.institution.trim() || null,
        accountType: account.accountType.trim() || 'checking',
        balance: parseNumber(account.balance) ?? null,
        interestRateApr: parseNumber(account.interestRateApr) ?? null,
        isEmergencyFund: account.isEmergencyFund,
        rateLastChecked: account.rateLastChecked ? new Date(account.rateLastChecked).toISOString() : null,
      } satisfies CashAccountPayload;
    })
    .filter((account): account is CashAccountPayload => account !== null);
}

export default function CashAccountsSectionForm({ userId, onStatusChange, currentStatus }: CashAccountsSectionFormProps) {
  const [accounts, setAccounts] = useState<AccountFormState[]>([createAccount(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canRemoveAccounts = accounts.length > 1;

  const handleAccountChange = <K extends keyof AccountFormState>(id: string, key: K, value: AccountFormState[K]) => {
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

  const payloadAccounts = useMemo(() => buildPayloadAccounts(accounts), [accounts]);

  const handleSubmit = async () => {
    setSaveState('saving');
    setErrorMessage(null);

    try {
      if (!optedOut && payloadAccounts.length === 0) {
        throw new Error('Please add at least one cash account or opt out of this section.');
      }

      const payload: CashAccountsProfilePayload = optedOut
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

      await upsertCashAccountsProfile(userId, payload);
      onStatusChange(optedOut ? 'opted_out' : 'completed');
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (error) {
      console.warn('Failed to save cash accounts section', error);
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
          label="I don’t have additional cash accounts"
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
              <Box key={account.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, position: 'relative', background: '#fafbff' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Nickname"
                        placeholder="e.g. Main checking"
                        value={account.nickname}
                        onChange={(event) => handleAccountChange(account.id, 'nickname', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Institution"
                        placeholder="Bank or credit union"
                        value={account.institution}
                        onChange={(event) => handleAccountChange(account.id, 'institution', event.target.value)}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        label="Account type"
                        placeholder="checking, savings, cd"
                        value={account.accountType}
                        onChange={(event) => handleAccountChange(account.id, 'accountType', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Balance ($)"
                        value={account.balance}
                        onChange={(event) => handleAccountChange(account.id, 'balance', event.target.value)}
                        inputProps={{ min: 0, step: 50 }}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Interest rate (APR %)"
                        value={account.interestRateApr}
                        onChange={(event) => handleAccountChange(account.id, 'interestRateApr', event.target.value)}
                        inputProps={{ min: 0, step: 0.05 }}
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="date"
                        label="Rate last checked"
                        InputLabelProps={{ shrink: true }}
                        value={account.rateLastChecked}
                        onChange={(event) => handleAccountChange(account.id, 'rateLastChecked', event.target.value)}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={account.isEmergencyFund}
                            onChange={(event) => handleAccountChange(account.id, 'isEmergencyFund', event.target.checked)}
                          />
                        }
                        label="Emergency fund"
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

            <Button
              type="button"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAccount}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add another account
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
            data-testid="cash-submit"
          >
            {saveState === 'saving' ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Saving
              </>
            ) : optedOut ? 'Acknowledge opt-out' : 'Save section'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Link these accounts so we can track your liquidity and emergency fund.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
