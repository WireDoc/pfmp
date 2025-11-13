import { Paper, Box, Typography, Skeleton } from '@mui/material';
import { useState, useEffect } from 'react';
import { getAccount, type AccountResponse } from '../../services/accountsApi';

interface CashAccountSummaryHeaderProps {
  accountId: number;
  loading?: boolean;
}

export function CashAccountSummaryHeader({ accountId, loading = false }: CashAccountSummaryHeaderProps) {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        setLoadingAccount(true);
        const accountData = await getAccount(accountId);
        setAccount(accountData);
      } catch (error) {
        console.error('Failed to fetch account details:', error);
      } finally {
        setLoadingAccount(false);
      }
    };

    fetchAccountDetails();
  }, [accountId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading || loadingAccount) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={150} />
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Skeleton variant="text" width={100} />
              <Skeleton variant="text" width={120} height={40} />
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="h5" gutterBottom>
            {account?.accountName || `Account #${accountId}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {account?.institution && `${account.institution} • `}
            {account?.accountType && account.accountType}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Balance
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(account?.currentBalance || 0)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
