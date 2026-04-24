/**
 * CryptoSettingsView (Wave 13 / Phase 1)
 *
 * Manage crypto exchange API connections (Kraken in P1) and view consolidated holdings.
 * Route: /dashboard/settings/crypto
 *
 * Hard requirement: Read-only API keys only — backend rejects any key with trade/withdraw scopes.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import {
  createExchangeConnection,
  deleteExchangeConnection,
  listCryptoHoldings,
  listExchangeConnections,
  syncExchangeConnection,
  type CryptoHolding,
  type ExchangeConnection,
} from '../../services/cryptoApi';
import { useDevUserId } from '../../dev/devUserState';

const SUPPORTED_PROVIDERS = ['Kraken', 'BinanceUS'] as const;

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function formatNumber(value: number, fractionDigits: number = 8): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export const CryptoSettingsView: React.FC = () => {
  const userId = useDevUserId();
  const [connections, setConnections] = useState<ExchangeConnection[] | null>(null);
  const [holdings, setHoldings] = useState<CryptoHolding[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>('Kraken');
  const [nickname, setNickname] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [conns, hold] = await Promise.all([
        listExchangeConnections(userId),
        listCryptoHoldings(userId),
      ]);
      setConnections(conns);
      setHoldings(hold);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load crypto data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleOpenDialog = () => {
    setProvider('Kraken');
    setNickname('');
    setApiKey('');
    setApiSecret('');
    setSubmitError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitError(null);
    if (!apiKey.trim() || !apiSecret.trim()) {
      setSubmitError('API key and secret are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createExchangeConnection(userId, {
        provider,
        nickname: nickname.trim() || null,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setDialogOpen(false);
      setToast('Exchange connected and initial sync complete.');
      await refresh();
    } catch (err) {
      const message = (err as { response?: { data?: string | { message?: string } }; message?: string });
      const data = message.response?.data;
      const msg = typeof data === 'string' ? data : data?.message ?? message.message ?? 'Failed to link exchange.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (connectionId: number) => {
    if (!userId) return;
    setSyncingId(connectionId);
    try {
      const result = await syncExchangeConnection(userId, connectionId);
      if (result.error) {
        setToast(`Sync error: ${result.error}`);
      } else {
        setToast(`Synced — ${result.holdingsUpserted} holdings, +${result.transactionsInserted} transactions`);
      }
      await refresh();
    } catch (err) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 429) {
        setToast('Manual sync is rate-limited to once per hour. Try again later.');
      } else {
        setToast('Sync failed.');
      }
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (connectionId: number) => {
    if (!userId) return;
    if (!window.confirm('Remove this exchange connection? Holdings and transaction history will also be deleted.')) {
      return;
    }
    setDeletingId(connectionId);
    try {
      await deleteExchangeConnection(userId, connectionId);
      setToast('Exchange connection removed.');
      await refresh();
    } catch {
      setToast('Failed to remove connection.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!userId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">No user selected.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Crypto Exchanges</Typography>
          <Typography variant="body2" color="text.secondary">
            Link read-only API keys to view holdings and transaction history. Trading and withdrawal scopes are rejected.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            Link Exchange
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}
      {toast && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Connections</Typography>
        {loading && connections === null ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={120} /></Box>
        ) : connections && connections.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  <TableCell>Nickname</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Sync</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connections.map(c => (
                  <TableRow key={c.exchangeConnectionId}>
                    <TableCell>{c.provider}</TableCell>
                    <TableCell>{c.nickname ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.status}
                        color={c.status === 'Active' ? 'success' : c.status === 'Error' ? 'error' : 'warning'}
                      />
                      {c.status === 'Error' && c.lastSyncError && (
                        <Tooltip title={c.lastSyncError}><span style={{ marginLeft: 8, color: 'red', cursor: 'help' }}>!</span></Tooltip>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2">{formatTimestamp(c.lastSyncAt)}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {c.scopes.map(s => <Chip key={s} size="small" icon={<LockIcon />} label={s} />)}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Sync now">
                        <span>
                          <IconButton
                            size="small"
                            disabled={syncingId === c.exchangeConnectionId}
                            onClick={() => void handleSync(c.exchangeConnectionId)}
                          >
                            {syncingId === c.exchangeConnectionId ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Remove connection">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={deletingId === c.exchangeConnectionId}
                            onClick={() => void handleDelete(c.exchangeConnectionId)}
                          >
                            {deletingId === c.exchangeConnectionId ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No exchanges linked yet. Click "Link Exchange" to add one.
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Holdings</Typography>
        {loading && holdings === null ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={120} /></Box>
        ) : holdings && holdings.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Market Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holdings.map(h => (
                  <TableRow key={h.cryptoHoldingId}>
                    <TableCell>{h.symbol}</TableCell>
                    <TableCell>{h.provider}</TableCell>
                    <TableCell align="right">{formatNumber(h.quantity)}</TableCell>
                    <TableCell align="right">{formatCurrency(h.marketValueUsd)}</TableCell>
                    <TableCell>
                      {h.isStaked ? (
                        <Chip
                          size="small"
                          color="primary"
                          label={h.stakingApyPercent ? `Staked · ${h.stakingApyPercent.toFixed(2)}% APY` : 'Staked'}
                        />
                      ) : (
                        <Chip size="small" label="Spot" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2">{formatTimestamp(h.lastPriceAt)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No holdings yet. Holdings appear after the first successful sync.
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Link Crypto Exchange</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide a <strong>read-only</strong> API key (Query Funds + Query Ledger). PFMP will reject keys with trading or withdrawal scopes.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              fullWidth
              size="small"
            >
              {SUPPORTED_PROVIDERS.map(p => (
                <MenuItem key={p} value={p}>{p === 'BinanceUS' ? 'Binance.US' : p}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nickname (optional)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g. Kraken Main"
            />
            <TextField
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              size="small"
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="API Secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              fullWidth
              size="small"
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Link Exchange
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CryptoSettingsView;
