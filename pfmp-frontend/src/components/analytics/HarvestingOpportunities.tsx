import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { formatCurrency } from '../../utils/exportHelpers';
import type { TaxLossOpportunity } from '../../api/portfolioAnalytics';

interface HarvestingOpportunitiesProps {
  opportunities: TaxLossOpportunity[];
  loading?: boolean;
}

export const HarvestingOpportunities: React.FC<HarvestingOpportunitiesProps> = ({
  opportunities,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tax-Loss Harvesting Opportunities
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  const totalPotentialSavings = opportunities.reduce(
    (sum, opp) => sum + opp.potentialTaxSavings,
    0
  );

  if (opportunities.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LightbulbIcon color="primary" />
          <Typography variant="h6">
            Tax-Loss Harvesting Opportunities
          </Typography>
        </Box>
        
        <Alert severity="success">
          No tax-loss harvesting opportunities found. All holdings are currently 
          showing gains or losses below the $500 threshold.
        </Alert>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>What is Tax-Loss Harvesting?</strong>
            <br />
            Tax-loss harvesting involves selling securities at a loss to offset capital 
            gains taxes. You can then purchase a similar (but not identical) security 
            to maintain market exposure while realizing the tax benefit.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LightbulbIcon color="primary" />
          <Typography variant="h6">
            Tax-Loss Harvesting Opportunities
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Securities showing losses &gt;$500 that could offset capital gains
        </Typography>

        {/* Total Potential Savings */}
        <Box 
          sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'success.lighter', 
            borderRadius: 1,
            border: 1,
            borderColor: 'success.main'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total Potential Tax Savings
          </Typography>
          <Typography variant="h5" color="success.main" fontWeight="bold">
            {formatCurrency(totalPotentialSavings)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Based on 24% short-term + 15% long-term capital gains rates
          </Typography>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Security</TableCell>
              <TableCell align="right">Unrealized Loss</TableCell>
              <TableCell align="right">Tax Savings</TableCell>
              <TableCell>Replacement Suggestion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {opportunities.map((opportunity) => (
              <TableRow key={opportunity.symbol} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {opportunity.symbol}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                    {opportunity.securityName}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error.main" fontWeight="medium">
                    {formatCurrency(opportunity.unrealizedLoss)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={formatCurrency(opportunity.potentialTaxSavings)}
                    color="success"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {opportunity.replacementSuggestion ? (
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {opportunity.replacementSuggestion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Similar exposure, avoids wash sale
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Consult with advisor
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Wash Sale Warning */}
      <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="warning.dark">
          <strong>⚠️ Wash Sale Rule:</strong> You cannot claim a tax loss if you 
          purchase the same or substantially identical security within 30 days 
          before or after the sale. Use the replacement suggestions to maintain 
          similar market exposure while avoiding this rule.
        </Typography>
      </Box>
    </Paper>
  );
};
