/**
 * InvestmentsSettingsView (Wave 12)
 * 
 * Settings page for managing connected investment/brokerage accounts.
 * Route: /dashboard/settings/investments
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Skeleton,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  TrendingUp as InvestmentsIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Receipt as TransactionsIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { PlaidInvestmentsLinkButton } from '../../components/plaid/PlaidInvestmentsLinkButton';
import { getInvestmentAccounts, syncInvestmentHoldings, syncInvestmentTransactions, getConnections } from '../../services/plaidApi';
import type { InvestmentAccount, PlaidConnection } from '../../services/plaidApi';
import { useDevUserId } from '../../dev/devUserState';

export const InvestmentsSettingsView: React.FC = () => {
  const devUserId = useDevUserId();
  const userId = devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingTransactions, setSyncingTransactions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [accountsData, connectionsData] = await Promise.all([
        getInvestmentAccounts(userId),
        getConnections(userId),
      ]);
      setAccounts(accountsData);
      // Filter connections to only those with investment accounts
      const investmentConnectionIds = new Set(accountsData.map(a => a.connectionId).filter(Boolean));
      setConnections(connectionsData.filter(c => investmentConnectionIds.has(c.connectionId)));
    } catch (err) {
      setError('Failed to load investment accounts. Please try again.');
      console.error('Error loading investment accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    setError(null);
    try {
      const result = await syncInvestmentHoldings(connectionId, userId);
      if (result.success) {
        setSuccessMessage(`Synced ${result.holdingsUpdated} holdings across ${result.accountsUpdated} accounts`);
        await loadData();
      } else {
        setError(result.errorMessage ?? 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync holdings. Please try again.');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncTransactions = async (connectionId: string) => {
    setSyncingTransactions(connectionId);
    setError(null);
    try {
      const result = await syncInvestmentTransactions(connectionId, userId);
      if (result.success) {
        setSuccessMessage(
          `Synced ${result.transactionsCreated} new transactions (${result.transactionsUpdated} updated, ${result.transactionsTotal} total)`
        );
      } else {
        setError(result.errorMessage ?? 'Transaction sync failed');
      }
    } catch (err) {
      setError('Failed to sync transactions. Please try again.');
    } finally {
      setSyncingTransactions(null);
    }
  };

  const handleLinkSuccess = () => {
    // Refresh the accounts list after linking a new brokerage
    loadData();
    setSuccessMessage('Investment account linked successfully!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasAccounts = accounts.length > 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          color="inherit"
        >
          Dashboard
        </Link>
        <Link
          component={RouterLink}
          to="/dashboard/settings"
          underline="hover"
          color="inherit"
        >
          Settings
        </Link>
        <Typography color="text.primary">Investment Accounts</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <InvestmentsIcon fontSize="large" color="success" />
          <Box>
            <Typography variant="h4">Investment Accounts</Typography>
            <Typography variant="body2" color="text.secondary">
              Link and manage your brokerage and retirement accounts
            </Typography>
          </Box>
        </Box>
        <PlaidInvestmentsLinkButton
          userId={userId}
          onSuccess={handleLinkSuccess}
          buttonText="Link Investment Account"
        />
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        </Paper>
      )}

      {/* Empty State */}
      {!loading && !hasAccounts && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InvestmentsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Investment Accounts Connected
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Link your brokerage or retirement accounts to automatically track your portfolio holdings.
          </Typography>
          <PlaidInvestmentsLinkButton
            userId={userId}
            onSuccess={handleLinkSuccess}
            variant="contained"
            color="success"
          />
        </Paper>
      )}

      {/* Accounts List */}
      {!loading && hasAccounts && (
        <Stack spacing={3}>
          {/* Summary */}
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Investment Value
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(accounts.reduce((sum, a) => sum + a.currentBalance, 0))}
                </Typography>
              </Box>
              <Chip 
                label={`${accounts.length} Account${accounts.length > 1 ? 's' : ''}`}
                color="success"
                variant="outlined"
              />
            </Box>
          </Paper>

          {/* Accounts Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Last Synced</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.accountId}>
                    <TableCell>
                      <Typography fontWeight="medium">{account.accountName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={account.accountType} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {formatCurrency(account.currentBalance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(account.lastSyncedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {account.connectionId && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Sync Holdings">
                            <IconButton
                              size="small"
                              onClick={() => handleSync(account.connectionId!)}
                              disabled={syncing === account.connectionId}
                            >
                              <SyncIcon 
                                fontSize="small"
                                sx={{ 
                                  animation: syncing === account.connectionId 
                                    ? 'spin 1s linear infinite' 
                                    : 'none'
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sync Transactions">
                            <IconButton
                              size="small"
                              onClick={() => handleSyncTransactions(account.connectionId!)}
                              disabled={syncingTransactions === account.connectionId}
                            >
                              <TransactionsIcon 
                                fontSize="small"
                                sx={{ 
                                  animation: syncingTransactions === account.connectionId 
                                    ? 'spin 1s linear infinite' 
                                    : 'none'
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Connection Info */}
          {connections.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Connected Institutions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {connections.map((conn) => (
                <Box 
                  key={conn.connectionId} 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  sx={{ py: 1 }}
                >
                  <Typography>{conn.institutionName}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={conn.status} 
                      size="small"
                      color={conn.status === 'Connected' ? 'success' : 'default'}
                    />
                    <Tooltip title="Sync All Holdings">
                      <IconButton
                        size="small"
                        onClick={() => handleSync(conn.connectionId)}
                        disabled={syncing === conn.connectionId}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Paper>
          )}
        </Stack>
      )}
    </Container>
  );
};

export default InvestmentsSettingsView;
