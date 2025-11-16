import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrency, formatPercent } from '../../utils/exportHelpers';
import type { PerformanceMetrics } from '../../api/portfolioAnalytics';

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetrics;
  loading?: boolean;
}

export const PerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({
  metrics,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Metrics
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const {
    totalReturn,
    timeWeightedReturn,
    moneyWeightedReturn,
    sharpeRatio,
    volatility,
  } = metrics;

  const isPositive = totalReturn.percent >= 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Performance Metrics
        </Typography>

        {/* Total Return - Primary Metric */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Return
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" color={isPositive ? 'success.main' : 'error.main'}>
              {formatCurrency(totalReturn.dollar)}
            </Typography>
            <Chip
              icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={formatPercent(totalReturn.percent)}
              color={isPositive ? 'success' : 'error'}
              size="small"
            />
          </Stack>
        </Box>

        {/* TWR and MWR */}
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Time-Weighted Return (TWR)
            </Typography>
            <Typography variant="h6" color={timeWeightedReturn >= 0 ? 'success.main' : 'error.main'}>
              {formatPercent(timeWeightedReturn)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Removes impact of cash flows
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Money-Weighted Return (MWR)
            </Typography>
            <Typography variant="h6" color={moneyWeightedReturn >= 0 ? 'success.main' : 'error.main'}>
              {formatPercent(moneyWeightedReturn)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Includes timing of contributions
            </Typography>
          </Box>

          {/* Risk Metrics */}
          <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Sharpe Ratio
            </Typography>
            <Typography variant="h6">
              {sharpeRatio.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Risk-adjusted return
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Volatility (Annualized)
            </Typography>
            <Typography variant="h6">
              {formatPercent(volatility)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Standard deviation of returns
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
