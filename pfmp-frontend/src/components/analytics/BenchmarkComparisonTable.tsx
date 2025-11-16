import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatPercent } from '../../utils/exportHelpers';
import type { BenchmarkComparison } from '../../api/portfolioAnalytics';

interface BenchmarkComparisonTableProps {
  benchmarks: BenchmarkComparison[];
  portfolioReturn: number;
  loading?: boolean;
}

export const BenchmarkComparisonTable: React.FC<BenchmarkComparisonTableProps> = ({
  benchmarks,
  portfolioReturn,
  loading = false,
}) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Benchmark Comparison
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Benchmark Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          How your portfolio compares to major market indices
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Index</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell align="right">Return</TableCell>
              <TableCell align="right">Volatility</TableCell>
              <TableCell align="right">Sharpe Ratio</TableCell>
              <TableCell align="right">vs Portfolio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Portfolio row */}
            <TableRow
              sx={{
                backgroundColor: 'action.hover',
                fontWeight: 'bold',
              }}
            >
              <TableCell>
                <strong>Your Portfolio</strong>
              </TableCell>
              <TableCell>-</TableCell>
              <TableCell align="right">
                <Chip
                  label={formatPercent(portfolioReturn)}
                  color={portfolioReturn >= 0 ? 'success' : 'error'}
                  size="small"
                  icon={portfolioReturn >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                />
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
            </TableRow>

            {/* Benchmark rows */}
            {benchmarks.map((benchmark) => {
              const difference = portfolioReturn - benchmark.return;
              const outperforming = difference > 0;

              return (
                <TableRow key={benchmark.symbol}>
                  <TableCell>{benchmark.name}</TableCell>
                  <TableCell>{benchmark.symbol}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatPercent(benchmark.return)}
                      color={benchmark.return >= 0 ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{formatPercent(benchmark.volatility)}</TableCell>
                  <TableCell align="right">{benchmark.sharpeRatio.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={outperforming ? 'success.main' : 'error.main'}
                      sx={{ fontWeight: 'medium' }}
                    >
                      {difference > 0 ? '+' : ''}
                      {formatPercent(difference)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
