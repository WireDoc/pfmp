import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format } from 'date-fns';

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface BalanceTrendChartProps {
  accountId: number;
}

type PeriodOption = '7d' | '30d' | '90d' | '1y' | 'all';

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  '1y': '1 Year',
  'all': 'All Time'
};

const PERIOD_DAYS: Record<Exclude<PeriodOption, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365
};

export const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({ accountId }) => {
  const [balanceHistory, setBalanceHistory] = useState<BalanceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('30d');

  // Fetch balance history
  const fetchBalanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (period !== 'all') {
        params.append('days', PERIOD_DAYS[period].toString());
      }

      const response = await fetch(`/api/accounts/${accountId}/balance-history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch balance history');
      }

      const data = await response.json();
      setBalanceHistory(data);
    } catch (err) {
      console.error('Error fetching balance history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance history');
    } finally {
      setLoading(false);
    }
  }, [accountId, period]);

  useEffect(() => {
    fetchBalanceHistory();
  }, [fetchBalanceHistory]);

  // Calculate min/max for better Y-axis scaling
  const { minBalance, maxBalance } = React.useMemo(() => {
    if (balanceHistory.length === 0) {
      return { minBalance: 0, maxBalance: 10000 };
    }

    const balances = balanceHistory.map(d => d.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    
    // Add 10% padding
    const padding = (max - min) * 0.1;
    return {
      minBalance: Math.floor((min - padding) / 100) * 100,
      maxBalance: Math.ceil((max + padding) / 100) * 100
    };
  }, [balanceHistory]);

  // Determine if balance is trending up or down
  const isPositiveTrend = React.useMemo(() => {
    if (balanceHistory.length < 2) return true;
    const first = balanceHistory[0].balance;
    const last = balanceHistory[balanceHistory.length - 1].balance;
    return last >= first;
  }, [balanceHistory]);

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Format date for X-axis
  const formatXAxis = (dateString: string) => {
    const date = new Date(dateString);
    if (period === '7d') {
      return format(date, 'EEE'); // Mon, Tue, Wed
    } else if (period === '30d' || period === '90d') {
      return format(date, 'MMM d'); // Jan 1, Jan 15
    } else {
      return format(date, 'MMM yyyy'); // Jan 2025
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(data.date), 'MMM d, yyyy')}
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(data.balance)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: PeriodOption | null) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (balanceHistory.length === 0) {
    return (
      <Alert severity="info">
        No balance history available for this account
      </Alert>
    );
  }

  return (
    <Box>
      {/* Period Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Balance Trend</Typography>
        
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
          aria-label="time period"
        >
          {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((periodKey) => (
            <ToggleButton key={periodKey} value={periodKey}>
              {PERIOD_LABELS[periodKey]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={balanceHistory}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositiveTrend ? '#4caf50' : '#f44336'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositiveTrend ? '#4caf50' : '#f44336'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          
          <YAxis
            domain={[minBalance, maxBalance]}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
            stroke="#666"
            width={60}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isPositiveTrend ? '#4caf50' : '#f44336'}
            strokeWidth={2}
            fill="url(#colorBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Starting Balance
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(balanceHistory[0].balance)}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Current Balance
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(balanceHistory[balanceHistory.length - 1].balance)}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Change
          </Typography>
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{ color: isPositiveTrend ? 'success.main' : 'error.main' }}
          >
            {isPositiveTrend ? '+' : ''}
            {formatCurrency(
              balanceHistory[balanceHistory.length - 1].balance - balanceHistory[0].balance
            )}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
