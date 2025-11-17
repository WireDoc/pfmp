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
  Stack,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrency } from '../../utils/exportHelpers';
import type { RebalancingRecommendation } from '../../api/portfolioAnalytics';

interface RebalancingRecommendationsProps {
  rebalanceActions: RebalancingRecommendation[];
  loading?: boolean;
}

export const RebalancingRecommendations: React.FC<RebalancingRecommendationsProps> = ({
  rebalanceActions,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Rebalancing Recommendations
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (!rebalanceActions || rebalanceActions.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6">
            Rebalancing Recommendations
          </Typography>
        </Box>
        <Alert severity="success">
          <Typography variant="body2">
            <strong>Portfolio is well-balanced!</strong> No rebalancing actions needed at this time.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Your current allocations are within acceptable ranges of your target allocations.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  // Separate buy and sell actions
  const sellActions = rebalanceActions.filter((a) => a.action.toLowerCase() === 'sell');
  const buyActions = rebalanceActions.filter((a) => a.action.toLowerCase() === 'buy');

  const totalSellValue = sellActions.reduce((sum, a) => sum + (a.dollarAmount ?? 0), 0);
  const totalBuyValue = buyActions.reduce((sum, a) => sum + (a.dollarAmount ?? 0), 0);

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Rebalancing Recommendations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Suggested actions to align your portfolio with target allocations
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              bgcolor: 'error.lighter',
              borderRadius: 1,
              border: 1,
              borderColor: 'error.light',
            }}
          >
            <Typography variant="caption" color="error.dark" fontWeight="bold">
              SELL ACTIONS
            </Typography>
            <Typography variant="h6" color="error.dark">
              {formatCurrency(totalSellValue)}
            </Typography>
            <Typography variant="caption" color="error.dark">
              {sellActions.length} position{sellActions.length !== 1 ? 's' : ''} to reduce
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              bgcolor: 'success.lighter',
              borderRadius: 1,
              border: 1,
              borderColor: 'success.light',
            }}
          >
            <Typography variant="caption" color="success.dark" fontWeight="bold">
              BUY ACTIONS
            </Typography>
            <Typography variant="h6" color="success.dark">
              {formatCurrency(totalBuyValue)}
            </Typography>
            <Typography variant="caption" color="success.dark">
              {buyActions.length} position{buyActions.length !== 1 ? 's' : ''} to increase
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Recommendations Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Holding</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rebalanceActions.map((action, index) => {
              const isSell = action.action.toLowerCase() === 'sell';

              return (
                <TableRow key={index} hover>
                  <TableCell>
                    <Chip
                      icon={isSell ? <TrendingDownIcon /> : <TrendingUpIcon />}
                      label={action.action}
                      color={isSell ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {action.holding}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {action.shares != null ? action.shares.toFixed(2) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {action.dollarAmount != null ? formatCurrency(action.dollarAmount) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {action.reason}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Educational Content */}
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1, m: 2 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Rebalancing Tips:</strong>
        </Typography>
        <Typography variant="caption" color="info.dark" display="block" sx={{ mt: 0.5 }}>
          • Consider tax implications before selling positions with large gains
        </Typography>
        <Typography variant="caption" color="info.dark" display="block">
          • Rebalance gradually over time to reduce market timing risk
        </Typography>
        <Typography variant="caption" color="info.dark" display="block">
          • Use new contributions to buy underweight positions instead of selling
        </Typography>
        <Typography variant="caption" color="info.dark" display="block">
          • Review rebalancing recommendations quarterly or when allocations drift {'>'} 5%
        </Typography>
      </Box>
    </Paper>
  );
};
