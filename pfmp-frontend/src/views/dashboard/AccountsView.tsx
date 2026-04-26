import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Chip,
  Button,
  Stack,
  Collapse,
  IconButton,
  TextField,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useDevUserId } from '../../dev/devUserState';
import { useDashboardData } from '../../services/dashboard/useDashboardData';
import type { AccountSnapshot, PropertySnapshot, LiabilitySnapshot } from '../../services/dashboard';
import { fetchTspSummaryLite } from '../../services/financialProfileApi';
import type { TspSummaryLite } from '../../services/financialProfileApi';
import { CashAccountModal } from '../../components/accounts/CashAccountModal';
import { NotePopover } from '../../components/notes/NotePopover';
import { AccountModal } from '../../components/accounts/AccountModal';
import { getCashAccount, updateCashAccount, deleteCashAccount, type CashAccountResponse, type CreateCashAccountRequest, type UpdateCashAccountRequest } from '../../services/cashAccountsApi';
import { getAccount, updateAccount, deleteAccount, type AccountResponse, type UpdateAccountRequest } from '../../services/accountsApi';
import { CryptoAccountsCard } from '../../components/crypto/CryptoAccountsCard';

function fmt$(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/** Extract numeric amount from CurrencyAmount or fallback to 0 */
function amt(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'amount' in (v as Record<string, unknown>)) return Number((v as { amount: number }).amount) || 0;
  return 0;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  total: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccountSection({ title, icon, count, total, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Paper sx={{ mb: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
          <Chip label={`${count} account${count !== 1 ? 's' : ''}`} size="small" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" color="primary">{fmt$(total)}</Typography>
          <IconButton size="small">{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

export function AccountsView() {
  const userId = useDevUserId() ?? 1;
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboardData();
  const [tsp, setTsp] = useState<TspSummaryLite | null>(null);
  const [filter, setFilter] = useState('');
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [editingCashAccount, setEditingCashAccount] = useState<CashAccountResponse | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    fetchTspSummaryLite(userId).then(setTsp).catch(() => {});
  }, [userId]);

  const handleEditAccount = async (account: AccountSnapshot) => {
    setLoadingEdit(true);
    try {
      if (account.isCashAccount) {
        const fullAccount = await getCashAccount(account.id);
        setEditingCashAccount(fullAccount);
        setCashModalOpen(true);
      } else {
        const accountIdNum = typeof account.id === 'number' ? account.id : parseInt(account.id, 10);
        if (!isNaN(accountIdNum)) {
          const fullAccount = await getAccount(accountIdNum);
          setEditingAccount(fullAccount);
        }
      }
    } catch (err) {
      console.error('Failed to load account for editing:', err);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleCashSave = async (request: CreateCashAccountRequest | UpdateCashAccountRequest, accountId?: string) => {
    if (accountId) {
      await updateCashAccount(accountId, request as UpdateCashAccountRequest);
    }
    refetch();
  };

  const handleCashDelete = async (accountId: string) => {
    await deleteCashAccount(accountId);
    refetch();
  };

  const handleAccountSave = async (accountId: number, request: UpdateAccountRequest) => {
    await updateAccount(accountId, request);
    refetch();
  };

  const handleAccountDelete = async (accountId: number) => {
    await deleteAccount(accountId);
    refetch();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} />
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={120} sx={{ mt: 2, borderRadius: 1 }} />)}
      </Box>
    );
  }

  if (error) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load accounts: {String(error)}</Alert></Box>;
  }

  const accounts = data?.accounts ?? [];
  const properties = data?.properties ?? [];
  const liabilities = data?.liabilities ?? [];

  // Split accounts into cash vs investment
  const cashAccounts = accounts.filter(a => a.isCashAccount || ['Checking', 'Savings', 'MoneyMarket', 'CertificateOfDeposit', 'HSA'].includes(a.type));
  const investmentAccounts = accounts.filter(a => !cashAccounts.includes(a) && a.id !== 'tsp_aggregate');

  const lc = filter.toLowerCase();
  const matchesFilter = (name: string, institution?: string) =>
    !filter || name.toLowerCase().includes(lc) || (institution ?? '').toLowerCase().includes(lc);

  const filteredCash = cashAccounts.filter(a => matchesFilter(a.name, a.institution));
  const filteredInv = investmentAccounts.filter(a => matchesFilter(a.name, a.institution));
  const filteredProps = properties.filter(p => matchesFilter(p.address, p.type));
  const filteredLiab = liabilities.filter(l => matchesFilter(l.name, l.type));

  const tspTotal = tsp?.totalBalance ?? tsp?.items.reduce((s, i) => s + (i.currentMarketValue ?? 0), 0) ?? 0;
  // Exclude tsp_aggregate from accounts sum since TSP is added separately via tspTotal
  const accountsExTsp = accounts.filter(a => a.id !== 'tsp_aggregate');
  const totalAssets = accountsExTsp.reduce((s, a) => s + amt(a.balance), 0) + properties.reduce((s, p) => s + amt(p.estimatedValue), 0) + tspTotal;
  const totalLiabilities = liabilities.reduce((s, l) => s + amt(l.currentBalance), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>All Accounts</Typography>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Total Assets</Typography>
            <Typography variant="h5" color="success.main">{fmt$(totalAssets)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Total Liabilities</Typography>
            <Typography variant="h5" color="error.main">{fmt$(totalLiabilities)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Net Worth</Typography>
            <Typography variant="h5" color="primary">{fmt$(totalAssets - totalLiabilities)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter */}
      <TextField
        fullWidth
        placeholder="Filter accounts by name or institution..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        sx={{ mb: 2 }}
        size="small"
      />

      {/* Cash Accounts */}
      <AccountSection
        title="Cash Accounts"
        icon={<AccountBalanceWalletIcon color="primary" />}
        count={filteredCash.length}
        total={filteredCash.reduce((s, a) => s + amt(a.balance), 0)}
      >
        {filteredCash.length === 0 ? (
          <Typography color="text.secondary">No cash accounts</Typography>
        ) : (
          <Stack spacing={1}>
            {filteredCash.map(a => (
              <Paper
                key={a.id}
                variant="outlined"
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate(`/dashboard/cash-accounts/${a.id}`)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.institution} &middot; {a.type}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotePopover entityType="cash_account" entityId={String(a.id)} />
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleEditAccount(a); }}
                      aria-label="Edit account"
                      disabled={loadingEdit}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fmt$(amt(a.balance))}</Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </AccountSection>

      {/* Investment Accounts */}
      <AccountSection
        title="Investment Accounts"
        icon={<TrendingUpIcon color="primary" />}
        count={filteredInv.length}
        total={filteredInv.reduce((s, a) => s + amt(a.balance), 0)}
      >
        {filteredInv.length === 0 ? (
          <Typography color="text.secondary">No investment accounts</Typography>
        ) : (
          <Stack spacing={1}>
            {filteredInv.map(a => (
              <Paper
                key={a.id}
                variant="outlined"
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate(`/dashboard/accounts/${a.id}`)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.institution} &middot; {a.type}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotePopover entityType="account" entityId={String(a.id)} />
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleEditAccount(a); }}
                      aria-label="Edit account"
                      disabled={loadingEdit}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fmt$(amt(a.balance))}</Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </AccountSection>

      {/* Crypto (Wave 13) */}
      <CryptoAccountsCard userId={userId} />

      {/* TSP */}
      {tsp && tspTotal > 0 && (
        <AccountSection
          title="Thrift Savings Plan (TSP)"
          icon={<AccountBalanceIcon color="primary" />}
          count={tsp.items.filter(i => i.units > 0).length}
          total={tspTotal}
        >
          <Paper
            variant="outlined"
            sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => navigate('/dashboard/tsp')}
          >
            <Stack spacing={0.5}>
              {tsp.items.filter(i => i.units > 0).map(fund => (
                <Box key={fund.fundCode} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{fund.fundCode} Fund</Typography>
                  <Typography variant="body2">
                    {fmt$(fund.currentMarketValue ?? 0)} ({(fund.currentMixPercent ?? (tspTotal > 0 ? ((fund.currentMarketValue ?? 0) / tspTotal) * 100 : 0)).toFixed(1)}%)
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </AccountSection>
      )}

      {/* Properties */}
      <AccountSection
        title="Real Estate"
        icon={<HomeIcon color="primary" />}
        count={filteredProps.length}
        total={filteredProps.reduce((s, p) => s + amt(p.estimatedValue) - amt(p.mortgageBalance), 0)}
      >
        {filteredProps.length === 0 ? (
          <Typography color="text.secondary">No properties</Typography>
        ) : (
          <Stack spacing={1}>
            {filteredProps.map(p => (
              <Paper
                key={p.id}
                variant="outlined"
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate(`/dashboard/properties/${p.id}`)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">{p.address}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.type} &middot; Equity: {fmt$(amt(p.estimatedValue) - amt(p.mortgageBalance))}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotePopover entityType="property" entityId={String(p.id)} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fmt$(amt(p.estimatedValue))}</Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </AccountSection>

      {/* Liabilities */}
      {filteredLiab.length > 0 && (
        <AccountSection
          title="Liabilities"
          icon={<AccountBalanceIcon color="error" />}
          count={filteredLiab.length}
          total={filteredLiab.reduce((s, l) => s + amt(l.currentBalance), 0)}
          defaultOpen={false}
        >
          <Stack spacing={1}>
            {filteredLiab.map(l => (
              <Paper
                key={l.id}
                variant="outlined"
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => {
                  if (l.propertyId) navigate(`/dashboard/properties/${l.propertyId}`);
                  else if (l.type?.toLowerCase().includes('credit')) navigate(`/dashboard/credit-cards/${l.id}`);
                  else navigate(`/dashboard/loans/${l.id}`);
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">{l.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{l.type} &middot; {l.interestRate?.toFixed(2)}% APR</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotePopover entityType="liability" entityId={String(l.id)} />
                    <Typography variant="subtitle1" color="error" sx={{ fontWeight: 600 }}>{fmt$(amt(l.currentBalance))}</Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </AccountSection>
      )}

      <CashAccountModal
        open={cashModalOpen}
        userId={userId}
        account={editingCashAccount}
        onClose={() => { setCashModalOpen(false); setEditingCashAccount(null); }}
        onSave={handleCashSave}
        onDelete={handleCashDelete}
      />

      <AccountModal
        open={!!editingAccount}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSave={handleAccountSave}
        onDelete={handleAccountDelete}
      />
    </Box>
  );
}
