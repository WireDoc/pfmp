import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Stack, Divider } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrency } from '../../utils/exportHelpers';
import type { TaxInsights } from '../../api/portfolioAnalytics';

interface TaxSummaryCardProps {
  taxInsights: TaxInsights;
  loading?: boolean;
}

export const TaxSummaryCard: React.FC<TaxSummaryCardProps> = ({
  taxInsights,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tax Summary
          </Typography>
          <Typography color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const {
    unrealizedGains,
    estimatedTaxLiability,
  } = taxInsights;

  const totalUnrealizedGain = unrealizedGains.total.dollar;
  const shortTermGain = unrealizedGains.shortTerm.dollar;
  const longTermGain = unrealizedGains.longTerm.dollar;
  const isPositiveGain = totalUnrealizedGain >= 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tax Summary
        </Typography>

        {/* Total Unrealized Gain/Loss */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Unrealized Gain/Loss
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography 
              variant="h4" 
              color={isPositiveGain ? 'success.main' : 'error.main'}
            >
              {formatCurrency(totalUnrealizedGain)}
            </Typography>
            <Chip
              icon={isPositiveGain ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={isPositiveGain ? 'Gain' : 'Loss'}
              color={isPositiveGain ? 'success' : 'error'}
              size="small"
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Short-Term vs Long-Term Breakdown */}
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Short-Term Gain/Loss
            </Typography>
            <Typography 
              variant="h6" 
              color={shortTermGain >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(shortTermGain)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Held ≤ 365 days • Taxed as ordinary income (24%)
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Long-Term Gain/Loss
            </Typography>
            <Typography 
              variant="h6" 
              color={longTermGain >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(longTermGain)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Held &gt; 365 days • Preferential tax rate (15%)
            </Typography>
          </Box>

          <Divider />

          {/* Estimated Tax Liability */}
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Estimated Tax if Sold Today
            </Typography>
            <Typography variant="h6" color="warning.main">
              {formatCurrency(estimatedTaxLiability.totalFederalTax)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on current federal tax brackets
            </Typography>
          </Box>
        </Stack>

        {/* Tax Tip */}
        <Box 
          sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: 'info.lighter', 
            borderRadius: 1,
            border: 1,
            borderColor: 'info.main'
          }}
        >
          <Typography variant="caption" color="info.dark">
            <strong>Tip:</strong> Consider holding short-term positions for &gt;1 year to 
            qualify for lower long-term capital gains rates.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
