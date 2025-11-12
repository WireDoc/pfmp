import { Paper, Box, Typography, Skeleton, Chip, Button, CircularProgress } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { getAccount, type AccountResponse } from '../../services/accountsApi';
import type { Holding } from '../../types/holdings';

interface AccountSummaryHeaderProps {
  accountId: number;
  holdings: Holding[];
  loading: boolean;
  onRefreshPrices?: () => void;
  refreshing?: boolean;
}

export function AccountSummaryHeader({ accountId, holdings, loading, onRefreshPrices, refreshing = false }: AccountSummaryHeaderProps) {
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

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  
  const isPositive = totalGainLoss >= 0;

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {account?.accountName || `Account #${accountId}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {account?.institution && `${account.institution} • `}
                {account?.accountType && `${account.accountType} • `}
                {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            {onRefreshPrices && (
              <Button
                variant="outlined"
                size="small"
                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={onRefreshPrices}
                disabled={refreshing || holdings.length === 0}
              >
                Refresh Prices
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Value
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {formatCurrency(totalValue)}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Gain/Loss
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              {isPositive ? (
                <TrendingUpIcon color="success" fontSize="small" />
              ) : (
                <TrendingDownIcon color="error" fontSize="small" />
              )}
              <Typography 
                variant="h4" 
                fontWeight="bold" 
                color={isPositive ? 'success.main' : 'error.main'}
              >
                {formatCurrency(totalGainLoss)}
              </Typography>
            </Box>
            <Chip 
              label={`${isPositive ? '+' : ''}${totalGainLossPercentage.toFixed(2)}%`}
              size="small"
              color={isPositive ? 'success' : 'error'}
              sx={{ mt: 0.5 }}
            />
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Cost Basis
            </Typography>
            <Typography variant="h5">
              {formatCurrency(totalCostBasis)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
