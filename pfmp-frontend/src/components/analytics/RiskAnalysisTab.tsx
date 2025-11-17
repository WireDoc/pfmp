import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { RiskMetricsCard } from './RiskMetricsCard';
import { VolatilityChart } from './VolatilityChart';
import { DrawdownChart } from './DrawdownChart';
import { CorrelationMatrix } from './CorrelationMatrix';
import { fetchRiskMetrics } from '../../api/portfolioAnalytics';
import type { RiskMetrics, Period } from '../../api/portfolioAnalytics';

interface RiskAnalysisTabProps {
  accountId: number;
  period?: Period;
}

export const RiskAnalysisTab: React.FC<RiskAnalysisTabProps> = ({
  accountId,
  period = '1Y',
}) => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRiskMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRiskMetrics(accountId, period);
        setRiskMetrics(data);
      } catch (err) {
        console.error('Error loading risk metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load risk metrics');
      } finally {
        setLoading(false);
      }
    };

    loadRiskMetrics();
  }, [accountId, period]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!riskMetrics) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No risk data available for this account
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Risk Analysis
      </Typography>

      {/* Top Row: Risk Metrics Card + Volatility Chart */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 3,
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 35%' } }}>
          <RiskMetricsCard
            riskMetrics={riskMetrics}
            loading={false}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 65%' } }}>
          <VolatilityChart
            data={riskMetrics.volatilityHistory}
            loading={false}
          />
        </Box>
      </Box>

      {/* Bottom Row: Drawdown Chart + Correlation Matrix */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
        }}
      >
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 50%' } }}>
          <DrawdownChart
            data={riskMetrics.drawdownHistory}
            loading={false}
          />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 50%' } }}>
          <CorrelationMatrix
            correlationMatrix={riskMetrics.correlationMatrix}
            loading={false}
          />
        </Box>
      </Box>

      {/* Educational Content */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Understanding Risk Metrics:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • <strong>Volatility</strong> measures how much your portfolio value fluctuates. Lower is more stable.
        </Typography>
        <Typography variant="body2">
          • <strong>Beta</strong> shows how your portfolio moves relative to the S&P 500. Beta of 1.0 means it moves in sync.
        </Typography>
        <Typography variant="body2">
          • <strong>Drawdown</strong> is the decline from a peak. Max drawdown shows your worst loss during the period.
        </Typography>
        <Typography variant="body2">
          • <strong>Correlation</strong> shows how holdings move together. Lower correlations mean better diversification.
        </Typography>
      </Alert>
    </Box>
  );
};
