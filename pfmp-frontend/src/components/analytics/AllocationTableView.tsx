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
  LinearProgress,
  Chip,
} from '@mui/material';
import { formatCurrency } from '../../utils/exportHelpers';
import type { AllocationItem } from '../../api/portfolioAnalytics';

interface AllocationTableViewProps {
  allocations: AllocationItem[];
  dimension: string;
  loading?: boolean;
}

type SortField = 'category' | 'value' | 'percent';
type SortOrder = 'asc' | 'desc';

export const AllocationTableView: React.FC<AllocationTableViewProps> = ({
  allocations,
  dimension,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('percent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Allocation Details
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...allocations].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const getConcentrationColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage < 20) return 'success';
    if (percentage < 30) return 'warning';
    return 'error';
  };

  const getConcentrationLabel = (percentage: number): string => {
    if (percentage < 20) return 'Well Diversified';
    if (percentage < 30) return 'Moderate';
    return 'Concentrated';
  };

  const getDimensionLabel = (dim: string): string => {
    switch (dim) {
      case 'assetClass': return 'Asset Class';
      case 'sector': return 'Sector';
      case 'geography': return 'Geography';
      case 'marketCap': return 'Market Cap';
      default: return dim;
    }
  };

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortOrder : 'desc'}
                  onClick={() => handleSort('category')}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'value'}
                  direction={sortField === 'value' ? sortOrder : 'desc'}
                  onClick={() => handleSort('value')}
                >
                  Value
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'percent'}
                  direction={sortField === 'percent' ? sortOrder : 'desc'}
                  onClick={() => handleSort('percent')}
                >
                  Percentage
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 200 }}>
                Allocation Bar
              </TableCell>
              <TableCell align="center">
                Concentration
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.category}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency(item.value)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {item.percent.toFixed(2)}%
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.percent, 100)}
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: item.percent > 30 ? 'error.main' : 
                                   item.percent > 20 ? 'warning.main' : 
                                   'success.main',
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                      {item.percent.toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={getConcentrationLabel(item.percent)}
                    color={getConcentrationColor(item.percent)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, pb: 2.5, bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Total Categories:</strong> {sortedData.length} • 
          <strong> Largest Allocation:</strong>{' '}
          {sortedData.length > 0 ? `${sortedData[0].category} (${sortedData[0].percent.toFixed(1)}%)` : 'N/A'}
        </Typography>
      </Box>
    </Paper>
  );
};
