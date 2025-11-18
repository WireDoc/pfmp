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

type SortField = 'symbol' | 'gainLoss' | 'percentGain' | 'holdingPeriod';
type SortOrder = 'asc' | 'desc';

export const TaxLotTable: React.FC<TaxLotTableProps> = ({
  holdings,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('gainLoss');
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
      case 'gainLoss':
        aValue = a.gainLoss;
        bValue = b.gainLoss;
        break;
      case 'percentGain':
        aValue = a.percentGain;
        bValue = b.percentGain;
        break;
      case 'holdingPeriod':
        aValue = a.holdingPeriod;
        bValue = b.holdingPeriod;
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
              <TableCell>Name</TableCell>
              <TableCell align="right">Cost Basis</TableCell>
              <TableCell align="right">Current Value</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'gainLoss'}
                  direction={sortField === 'gainLoss' ? sortOrder : 'asc'}
                  onClick={() => handleSort('gainLoss')}
                >
                  Gain/Loss ($)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'percentGain'}
                  direction={sortField === 'percentGain' ? sortOrder : 'asc'}
                  onClick={() => handleSort('percentGain')}
                >
                  Gain/Loss (%)
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'holdingPeriod'}
                  direction={sortField === 'holdingPeriod' ? sortOrder : 'asc'}
                  onClick={() => handleSort('holdingPeriod')}
                >
                  Holding Period
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedHoldings.map((holding) => {
              const isGain = holding.gainLoss >= 0;
              const isLongTerm = holding.taxType === 'longTerm';

              return (
                <TableRow key={holding.symbol} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {holding.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {holding.name}
                    </Typography>
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
                      {formatCurrency(holding.gainLoss)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={isGain ? 'success.main' : 'error.main'}
                    >
                      {holding.percentGain.toFixed(2)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">
                        {holding.holdingPeriod}
                      </Typography>
                      <Chip
                        label={isLongTerm ? 'Long-Term' : 'Short-Term'}
                        color={isLongTerm ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
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
