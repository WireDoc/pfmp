import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Checkbox,
  Button,
  MenuItem,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  fetchCashAccountsProfile,
  upsertCashAccountsProfile,
  type FinancialProfileSectionStatusValue,
  type CashAccountsProfilePayload,
  type CashAccountPayload,
  type SectionOptOutPayload,
} from '../../services/financialProfileApi';
import { useSectionHydration } from '../hooks/useSectionHydration';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import { CsvImportModal } from '../../components/accounts/CsvImportModal';

type CashAccountsSectionFormProps = {
  userId: number;
  onStatusChange: (status: FinancialProfileSectionStatusValue) => void;
  currentStatus: FinancialProfileSectionStatusValue;
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'cd', label: 'Certificate of Deposit (CD)' },
  { value: 'high_yield_savings', label: 'High-Yield Savings' },
  { value: 'other', label: 'Other' },
];

type AccountFormState = {
  id: string;
  nickname: string;
  institution: string;
  accountType: string;
  balance: string;
  interestRateApr: string;
  isEmergencyFund: boolean;
  rateLastChecked: string;
  purpose: string;
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
  purpose: '',
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
  const payloads: CashAccountPayload[] = [];
  accounts.forEach((account) => {
    const hasValues =
      account.nickname.trim() !== '' ||
      account.institution.trim() !== '' ||
      account.balance.trim() !== '' ||
      account.interestRateApr.trim() !== '';
    if (!hasValues) return;
    payloads.push({
      nickname: account.nickname.trim() || null,
      institution: account.institution.trim() || null,
      accountType: account.accountType.trim() || 'checking',
      balance: parseNumber(account.balance) ?? null,
      interestRateApr: parseNumber(account.interestRateApr) ?? null,
      isEmergencyFund: account.isEmergencyFund,
      rateLastChecked: account.rateLastChecked ? new Date(account.rateLastChecked).toISOString() : null,
      purpose: account.purpose.trim() || null,
    });
  });
  return payloads;
}

export default function CashAccountsSectionForm({ userId, onStatusChange, currentStatus }: CashAccountsSectionFormProps) {
  const [accounts, setAccounts] = useState<AccountFormState[]>([createAccount(1)]);
  const [optedOut, setOptedOut] = useState<boolean>(currentStatus === 'opted_out');
  const [optOutReason, setOptOutReason] = useState<string>('');
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const canRemoveAccounts = accounts.length > 1;

  type HydratedState = { accounts: AccountFormState[]; optedOut: boolean; optOutReason: string };
  const mapPayloadToState = useCallback((payload: CashAccountsProfilePayload): HydratedState => {
    const hydratedAccounts = (payload.accounts ?? []).map((account, index) => ({
      id: `account-${index + 1}`,
      nickname: account.nickname ?? '',
      institution: account.institution ?? '',
      accountType: account.accountType ?? 'checking',
      balance: account.balance != null ? String(account.balance) : '',
      interestRateApr: account.interestRateApr != null ? String(account.interestRateApr) : '',
      isEmergencyFund: account.isEmergencyFund ?? false,
      rateLastChecked: account.rateLastChecked ? account.rateLastChecked.slice(0, 10) : '',
      purpose: account.purpose ?? '',
    }));
    const optedOutState = payload.optOut?.isOptedOut === true;
    return { accounts: hydratedAccounts.length > 0 ? hydratedAccounts : [createAccount(1)], optedOut: optedOutState, optOutReason: payload.optOut?.reason ?? '' };
  }, []);

  const applyHydratedState = useCallback(({ accounts: nextAccounts, optedOut: nextOptedOut, optOutReason: nextReason }: HydratedState) => {
    setAccounts(nextAccounts);
    setOptedOut(nextOptedOut);
    setOptOutReason(nextReason ?? '');
  }, []);

  useSectionHydration({ sectionKey: 'cash', userId, fetcher: fetchCashAccountsProfile, mapPayloadToState, applyState: applyHydratedState });

  const handleAccountChange = <K extends keyof AccountFormState>(id: string, key: K, value: AccountFormState[K]) => {
    setAccounts((prev) => prev.map((account) => (account.id === id ? { ...account, [key]: value } : account)));
  };
  const handleAddAccount = () => setAccounts((prev) => [...prev, createAccount(prev.length + 1)]);
  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      return remaining.length > 0 ? remaining : [createAccount(1)];
    });
  };

  const handleOpenCsvImport = () => setCsvImportOpen(true);
  const handleCloseCsvImport = () => setCsvImportOpen(false);
  const handleCsvImportSuccess = () => {
    // Refresh the form data from backend after import
    window.location.reload();
  };

  const payloadAccounts = useMemo(() => buildPayloadAccounts(accounts), [accounts]);

  function deriveStatus(payload: CashAccountsProfilePayload): FinancialProfileSectionStatusValue {
    if (payload.optOut?.isOptedOut) return 'opted_out';
    return payload.accounts.length > 0 ? 'completed' : 'needs_info';
  }
  function sanitizeOptOut(optOut?: SectionOptOutPayload | null): SectionOptOutPayload | undefined {
    if (!optOut?.isOptedOut) return undefined;
    const reason = optOut.reason?.trim();
    return { isOptedOut: true, reason: reason && reason.length > 0 ? reason : undefined, acknowledgedAt: optOut.acknowledgedAt ?? new Date().toISOString() };
  }
  function buildPayload(): CashAccountsProfilePayload {
    if (optedOut) {
      return { accounts: [], optOut: sanitizeOptOut({ isOptedOut: true, reason: optOutReason, acknowledgedAt: new Date().toISOString() }) };
    }
    return { accounts: payloadAccounts, optOut: undefined };
  }

  const persistCash = useCallback(async (draft: CashAccountsProfilePayload) => {
    if (!draft.optOut?.isOptedOut && draft.accounts.length === 0) {
      throw new Error('Please add at least one cash account or opt out of this section.');
    }
    await upsertCashAccountsProfile(userId, draft);
    return deriveStatus(draft);
  }, [userId]);

  const { status: autoStatus, isDirty, error: autoError, lastSavedAt, flush } = useAutoSaveForm<CashAccountsProfilePayload>({
    data: buildPayload(),
    persist: persistCash,
    determineStatus: deriveStatus,
    onStatusResolved: onStatusChange,
    debounceMs: 800,
  });

  useEffect(() => {
    interface PFMPWindow extends Window { __pfmpCurrentSectionFlush?: () => Promise<void>; }
    const w: PFMPWindow = window as PFMPWindow;
    w.__pfmpCurrentSectionFlush = flush;
    return () => {
      if (w.__pfmpCurrentSectionFlush === flush) w.__pfmpCurrentSectionFlush = undefined;
    };
  }, [flush]);

  const handleOptOutToggle = (checked: boolean) => setOptedOut(checked);

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void flush(); }}>
      <Stack spacing={3} sx={{ mt: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>Autosave keeps this section in sync.</Typography>
          <AutoSaveIndicator status={autoStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} error={autoError} />
        </Stack>
        <FormControlLabel control={<Switch checked={optedOut} onChange={(e) => handleOptOutToggle(e.target.checked)} color="primary" />} label="I don’t have additional cash accounts" />
        {optedOut ? (
          <TextField label="Why are you opting out?" value={optOutReason} onChange={(e) => setOptOutReason(e.target.value)} multiline minRows={3} fullWidth />
        ) : (
          <Stack spacing={4}>
            {accounts.map((account, index) => (
              <Box key={account.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, position: 'relative', background: '#fafbff' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField label="Nickname" placeholder="e.g. Main checking" value={account.nickname} onChange={(e) => handleAccountChange(account.id, 'nickname', e.target.value)} fullWidth />
                      <TextField label="Institution" placeholder="Bank or credit union" value={account.institution} onChange={(e) => handleAccountChange(account.id, 'institution', e.target.value)} fullWidth />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField 
                        select
                        label="Account type" 
                        value={account.accountType} 
                        onChange={(e) => handleAccountChange(account.id, 'accountType', e.target.value)} 
                        fullWidth
                      >
                        {ACCOUNT_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField type="number" label="Balance ($)" value={account.balance} onChange={(e) => handleAccountChange(account.id, 'balance', e.target.value)} inputProps={{ min: 0, step: 50 }} fullWidth />
                      <TextField type="number" label="Interest rate (APR %)" value={account.interestRateApr} onChange={(e) => handleAccountChange(account.id, 'interestRateApr', e.target.value)} inputProps={{ min: 0, step: 0.05 }} fullWidth />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                      <TextField type="date" label="Rate last checked" InputLabelProps={{ shrink: true }} value={account.rateLastChecked} onChange={(e) => handleAccountChange(account.id, 'rateLastChecked', e.target.value)} fullWidth />
                      <FormControlLabel control={<Checkbox checked={account.isEmergencyFund} onChange={(e) => handleAccountChange(account.id, 'isEmergencyFund', e.target.checked)} />} label="Emergency fund" />
                    </Stack>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <TextField 
                        label="Purpose/Notes (optional)" 
                        placeholder="e.g. Emergency Fund, Vacation Savings, Home Down Payment"
                        value={account.purpose} 
                        onChange={(e) => handleAccountChange(account.id, 'purpose', e.target.value)} 
                        helperText="Describe what this account is for (max 500 characters)"
                        inputProps={{ maxLength: 500 }}
                        fullWidth 
                        multiline
                        rows={2}
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
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#607d8b' }}>Account {index + 1}</Typography>
              </Box>
            ))}
            <Stack direction="row" spacing={2}>
              <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={handleAddAccount} sx={{ alignSelf: 'flex-start' }}>Add another account</Button>
              <Button type="button" variant="outlined" startIcon={<UploadFileIcon />} onClick={handleOpenCsvImport} sx={{ alignSelf: 'flex-start' }}>Import CSV</Button>
            </Stack>
          </Stack>
        )}
        {autoError ? (
          <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
            {String(autoError instanceof Error ? autoError.message : autoError)}
          </Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary">Link these accounts so we can track your liquidity and emergency fund.</Typography>
      </Stack>
      
      <CsvImportModal
        open={csvImportOpen}
        userId={userId}
        onClose={handleCloseCsvImport}
        onSuccess={handleCsvImportSuccess}
      />
    </Box>
  );
}

