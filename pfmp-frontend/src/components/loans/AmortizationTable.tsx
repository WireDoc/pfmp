/**
 * Amortization Table Component
 * Displays the full amortization schedule with payment breakdown
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import type { AmortizationScheduleResponse } from '../../api/loanAnalytics';

interface AmortizationTableProps {
  schedule: AmortizationScheduleResponse;
}

export function AmortizationTable({ schedule }: AmortizationTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [showFutureOnly, setShowFutureOnly] = useState(true);

  const today = useMemo(() => new Date(), []);
  
  const filteredSchedule = useMemo(() => {
    if (!showFutureOnly) return schedule.schedule;
    return schedule.schedule.filter(payment => new Date(payment.date) >= today);
  }, [schedule.schedule, showFutureOnly, today]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedSchedule = filteredSchedule.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Amortization Schedule
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showFutureOnly}
              onChange={(e) => {
                setShowFutureOnly(e.target.checked);
                setPage(0);
              }}
            />
          }
          label="Show future payments only"
        />
      </Box>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <SummaryChip 
          label="Total Payments" 
          value={formatCurrency(schedule.summary.totalPayments)} 
        />
        <SummaryChip 
          label="Total Principal" 
          value={formatCurrency(schedule.summary.totalPrincipal)} 
          color="success"
        />
        <SummaryChip 
          label="Total Interest" 
          value={formatCurrency(schedule.summary.totalInterest)} 
          color="warning"
        />
        <SummaryChip 
          label="Payments Made" 
          value={`${schedule.summary.paymentsMade} / ${schedule.schedule.length}`} 
        />
      </Box>

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Payment</TableCell>
              <TableCell align="right">Principal</TableCell>
              <TableCell align="right">Interest</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Cumulative Interest</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSchedule.map((payment) => {
              const isPast = new Date(payment.date) < today;
              return (
                <TableRow 
                  key={payment.paymentNumber}
                  sx={{ 
                    opacity: isPast ? 0.6 : 1,
                    bgcolor: isPast ? 'action.hover' : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {payment.paymentNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(payment.date)}
                    {isPast && (
                      <Chip label="Paid" size="small" color="success" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(payment.payment)}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    {formatCurrency(payment.principal)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'warning.main' }}>
                    {formatCurrency(payment.interest)}
                  </TableCell>
                  <TableCell align="right" fontWeight={500}>
                    {formatCurrency(payment.balance)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {formatCurrency(payment.cumulativeInterest)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[12, 24, 36, 60]}
        component="div"
        count={filteredSchedule.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SummaryChipProps {
  label: string;
  value: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function SummaryChip({ label, value, color = 'default' }: SummaryChipProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Chip label={value} color={color} variant="outlined" />
    </Box>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}
