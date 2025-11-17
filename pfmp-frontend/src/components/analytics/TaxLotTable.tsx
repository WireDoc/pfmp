import React, { useState } from 'react';
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
  TableSortLabel,
  Chip,
} from '@mui/material';
import { formatCurrency } from '../../utils/exportHelpers';
import type { HoldingTaxDetail } from '../../api/portfolioAnalytics';

interface TaxLotTableProps {
  holdings: HoldingTaxDetail[];
  loading?: boolean;
}

type SortField = 'symbol' | 'unrealizedGain' | 'unrealizedGainPercent' | 'holdingPeriodDays' | 'estimatedTaxIfSold';
type SortOrder = 'asc' | 'desc';

export const TaxLotTable: React.FC<TaxLotTableProps> = ({
  holdings,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('unrealizedGain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'unrealizedGain':
        aValue = a.unrealizedGain;
        bValue = b.unrealizedGain;
        break;
      case 'unrealizedGainPercent':
        aValue = a.unrealizedGainPercent;
        bValue = b.unrealizedGainPercent;
        break;
      case 'holdingPeriodDays':
        aValue = a.holdingPeriodDays;
        bValue = b.holdingPeriodDays;
        break;
      case 'estimatedTaxIfSold':
        aValue = a.estimatedTaxIfSold;
        bValue = b.estimatedTaxIfSold;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tax Lot Details
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (holdings.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tax Lot Details
        </Typography>
        <Typography color="text.secondary">
          No holdings with tax implications found.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tax Lot Details
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detailed breakdown of unrealized gains/losses by holding
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'symbol'}
                  direction={sortField === 'symbol' ? sortOrder : 'asc'}
                  onClick={() => handleSort('symbol')}
                >
                  Symbol
                </TableSortLabel>
              </TableCell>
              <TableCell>Security</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Cost Basis</TableCell>
              <TableCell align="right">Current Value</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'unrealizedGain'}
                  direction={sortField === 'unrealizedGain' ? sortOrder : 'asc'}
                  onClick={() => handleSort('unrealizedGain')}
                >
                  Gain/Loss ($)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'unrealizedGainPercent'}
                  direction={sortField === 'unrealizedGainPercent' ? sortOrder : 'asc'}
                  onClick={() => handleSort('unrealizedGainPercent')}
                >
                  Gain/Loss (%)
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'holdingPeriodDays'}
                  direction={sortField === 'holdingPeriodDays' ? sortOrder : 'asc'}
                  onClick={() => handleSort('holdingPeriodDays')}
                >
                  Holding Period
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'estimatedTaxIfSold'}
                  direction={sortField === 'estimatedTaxIfSold' ? sortOrder : 'asc'}
                  onClick={() => handleSort('estimatedTaxIfSold')}
                >
                  Est. Tax
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedHoldings.map((holding) => {
              const isGain = holding.unrealizedGain >= 0;
              const isLongTerm = holding.isLongTerm;

              return (
                <TableRow key={holding.symbol} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {holding.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {holding.securityName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {holding.shares.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.costBasis)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.currentValue)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={isGain ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {formatCurrency(holding.unrealizedGain)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={isGain ? 'success.main' : 'error.main'}
                    >
                      {holding.unrealizedGainPercent.toFixed(2)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">
                        {holding.holdingPeriodDays} days
                      </Typography>
                      <Chip
                        label={isLongTerm ? 'Long-Term' : 'Short-Term'}
                        color={isLongTerm ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {formatCurrency(holding.estimatedTaxIfSold)}
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
