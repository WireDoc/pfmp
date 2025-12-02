/**
 * Loan Summary Header Component
 * Displays key loan metrics in a summary card
 */

import { Box, Paper, Typography, Chip, LinearProgress } from '@mui/material';
import {
  Home as HomeIcon,
  DirectionsCar as CarIcon,
  School as SchoolIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import type { LoanDetailsResponse } from '../../api/loanAnalytics';

interface LoanSummaryHeaderProps {
  loan: LoanDetailsResponse;
}

export function LoanSummaryHeader({ loan }: LoanSummaryHeaderProps) {
  const LoanIcon = getLoanIcon(loan.liabilityType);
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Loan Icon */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
          }}
        >
          <LoanIcon sx={{ fontSize: 32 }} />
        </Box>

        {/* Loan Info */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h5" fontWeight={600}>
              {loan.lender}
            </Typography>
            <Chip 
              label={formatLoanType(loan.liabilityType)} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {loan.interestRate.toFixed(2)}% APR • {loan.termMonths} month term • 
            Started {formatDate(loan.startDate)}
          </Typography>
        </Box>

        {/* Balance */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h4" fontWeight={700} color="error.main">
            {formatCurrency(loan.currentBalance)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            of {formatCurrency(loan.originalAmount)} remaining
          </Typography>
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {loan.percentPaidOff.toFixed(1)}% paid off
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loan.paymentsRemaining} payments remaining
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={loan.percentPaidOff}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              bgcolor: 'success.main',
            },
          }}
        />
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'flex', gap: 4, mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <QuickStat label="Monthly Payment" value={formatCurrency(loan.monthlyPayment)} />
        <QuickStat label="Interest Paid" value={formatCurrency(loan.totalInterestPaid)} color="warning.main" />
        <QuickStat label="Interest Remaining" value={formatCurrency(loan.totalInterestRemaining)} />
        <QuickStat label="Payoff Date" value={formatDate(loan.estimatedPayoffDate)} />
      </Box>
    </Paper>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface QuickStatProps {
  label: string;
  value: string;
  color?: string;
}

function QuickStat({ label, value, color }: QuickStatProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={600} color={color}>
        {value}
      </Typography>
    </Box>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLoanIcon(type: string) {
  switch (type) {
    case 'mortgage':
      return HomeIcon;
    case 'auto_loan':
      return CarIcon;
    case 'student_loan':
      return SchoolIcon;
    default:
      return BankIcon;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

function formatLoanType(type: string): string {
  const typeMap: Record<string, string> = {
    mortgage: 'Mortgage',
    auto_loan: 'Auto Loan',
    personal_loan: 'Personal Loan',
    student_loan: 'Student Loan',
  };
  return typeMap[type] || type;
}
