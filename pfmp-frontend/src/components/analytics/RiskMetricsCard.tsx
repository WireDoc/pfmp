import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider, Chip } from '@mui/material';
import type { RiskMetrics } from '../../api/portfolioAnalytics';

interface RiskMetricsCardProps {
  riskMetrics: RiskMetrics;
  loading?: boolean;
}

export const RiskMetricsCard: React.FC<RiskMetricsCardProps> = ({
  riskMetrics,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Risk Metrics
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const {
    volatility,
    beta,
    maxDrawdown,
    maxDrawdownDate,
  } = riskMetrics;

  // Risk level classification (volatility is already in percentage form)
  const getVolatilityLevel = (vol: number) => {
    if (vol < 10) return { label: 'Low', color: 'success' as const };
    if (vol < 20) return { label: 'Moderate', color: 'info' as const };
    if (vol < 30) return { label: 'High', color: 'warning' as const };
    return { label: 'Very High', color: 'error' as const };
  };

  const getBetaLevel = (betaValue: number) => {
    if (betaValue < 0.8) return { label: 'Defensive', color: 'success' as const };
    if (betaValue < 1.2) return { label: 'Market-Like', color: 'info' as const };
    return { label: 'Aggressive', color: 'warning' as const };
  };

  const volatilityLevel = getVolatilityLevel(volatility);
  const betaLevel = getBetaLevel(beta);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Risk Metrics
        </Typography>

        <Stack spacing={2}>
          {/* Volatility */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Volatility (Annual Std Dev)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="h5">
                {volatility.toFixed(2)}%
              </Typography>
              <Chip
                label={volatilityLevel.label}
                color={volatilityLevel.color}
                size="small"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Measures price fluctuation over time
            </Typography>
          </Box>

          <Divider />

          {/* Beta */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Beta (vs S&P 500)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="h5">
                {beta.toFixed(2)}
              </Typography>
              <Chip
                label={betaLevel.label}
                color={betaLevel.color}
                size="small"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {beta < 1 
                ? 'Less volatile than market' 
                : beta > 1 
                ? 'More volatile than market'
                : 'Moves with market'}
            </Typography>
          </Box>

          <Divider />

          {/* Max Drawdown */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Maximum Drawdown
            </Typography>
            <Typography variant="h5" color="error.main" sx={{ mt: 0.5 }}>
              {maxDrawdown.toFixed(2)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Largest peak-to-trough decline
              {maxDrawdownDate && ` (on ${new Date(maxDrawdownDate).toLocaleDateString()})`}
            </Typography>
          </Box>
        </Stack>

        {/* Risk Explanation */}
        <Box 
          sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            border: 1,
            borderColor: 'grey.300'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <strong>Understanding Risk:</strong>
            <br />
            • <strong>Volatility</strong>: Higher = more price swings
            <br />
            • <strong>Beta</strong>: 1.0 = moves with market, &gt;1.0 = amplified moves
            <br />
            • <strong>Drawdown</strong>: Maximum loss from peak value
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
