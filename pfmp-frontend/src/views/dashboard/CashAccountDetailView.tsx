import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Tabs, Tab, Typography, CircularProgress, Breadcrumbs, Link } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { TransactionList } from '../../components/cash-accounts/TransactionList';
import { BalanceTrendChart } from '../../components/cash-accounts/BalanceTrendChart';
import { AccountDetailsCard } from '../../components/cash-accounts/AccountDetailsCard';
import { getCashAccount, type CashAccountResponse } from '../../services/cashAccountsApi';

const CashAccountDetailView: React.FC = () => {
  const { cashAccountId } = useParams<{ cashAccountId: string }>();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [account, setAccount] = useState<CashAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cash account details
  useEffect(() => {
    const fetchAccount = async () => {
      if (!cashAccountId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getCashAccount(cashAccountId);
        setAccount(data);
      } catch (err) {
        console.error('Error fetching cash account:', err);
        setError('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [cashAccountId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !account) {
    return (
      <Box p={3}>
        <Typography color="error">{error || 'Account not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Secondary Breadcrumbs - Back Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">{account.nickname}</Typography>
      </Breadcrumbs>

      {/* Account Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          {account.nickname}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {account.institution} • {account.accountType}
        </Typography>
      </Box>

      {/* Account Details Card */}
      <Box mb={3}>
        <AccountDetailsCard account={account} />
      </Box>

      {/* Tabs */}
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="cash account tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Transactions" />
          <Tab label="Balance Trend" />
        </Tabs>

        {/* Tab Panels */}
        <Box p={3}>
          {currentTab === 0 && cashAccountId && (
            <TransactionList cashAccountId={cashAccountId} />
          )}
          {currentTab === 1 && cashAccountId && (
            <BalanceTrendChart cashAccountId={cashAccountId} />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default CashAccountDetailView;
