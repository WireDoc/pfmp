import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, Skeleton, Stack } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchCashFlowSummary, type CashFlowData } from '../../services/dashboard/overviewApi';

export const CashFlowWidget: React.FC = () => {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCashFlowSummary()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 2 }} data-testid="cash-flow-loading">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 2 }} data-testid="cash-flow-error">
        <Typography variant="h6" gutterBottom>Monthly Cash Flow</Typography>
        <Typography color="error">Unable to load cash flow data</Typography>
      </Paper>
    );
  }

  const netPositive = data.netCashFlow >= 0;

  // Build chart data: income categories (green) + expense categories (red)
  const chartData = [
    ...data.incomeBreakdown.map(item => ({
      name: item.category,
      amount: Number(item.monthlyAmount),
      type: 'income' as const,
    })),
    ...data.expenseBreakdown.map(item => ({
      name: item.category,
      amount: Number(item.monthlyAmount),
      type: 'expense' as const,
    })),
  ];

  return (
    <Paper sx={{ p: 2 }} data-testid="cash-flow-widget">
      <Typography variant="h6" gutterBottom>Monthly Cash Flow</Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Income</Typography>
          <Typography variant="h6" color="success.main">
            ${Number(data.totalMonthlyIncome).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Expenses</Typography>
          <Typography variant="h6" color="error.main">
            ${Number(data.totalMonthlyExpenses).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Net</Typography>
          <Typography variant="h6" color={netPositive ? 'success.main' : 'error.main'}>
            {netPositive ? '+' : '-'}${Math.abs(Number(data.netCashFlow)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Typography>
        </Box>
        <Chip
          label={`${data.savingsRate}% savings rate`}
          size="small"
          color={data.savingsRate >= 20 ? 'success' : data.savingsRate >= 10 ? 'warning' : 'error'}
          sx={{ alignSelf: 'center' }}
        />
      </Stack>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.type === 'income' ? '#4caf50' : '#f44336'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};
