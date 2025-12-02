/**
 * Credit Card Summary Component
 * Displays credit card details in a summary format
 */

import { Box, Typography, Divider } from '@mui/material';
import type { CreditUtilizationResponse } from '../../api/loanAnalytics';

interface CreditCardSummaryProps {
  utilization: CreditUtilizationResponse;
}

export function CreditCardSummary({ utilization }: CreditCardSummaryProps) {
  const availableCredit = utilization.creditLimit - utilization.currentBalance;

  return (
    <Box>
      <SummaryRow
        label="Credit Limit"
        value={formatCurrency(utilization.creditLimit)}
      />
      <SummaryRow
        label="Current Balance"
        value={formatCurrency(utilization.currentBalance)}
        color="error.main"
      />
      <SummaryRow
        label="Available Credit"
        value={formatCurrency(availableCredit)}
        color="success.main"
      />
      
      <Divider sx={{ my: 2 }} />
      
      {utilization.interestRate && (
        <SummaryRow
          label="APR"
          value={`${utilization.interestRate.toFixed(2)}%`}
        />
      )}
      {utilization.minimumPayment && (
        <SummaryRow
          label="Minimum Payment"
          value={formatCurrency(utilization.minimumPayment)}
        />
      )}
      {utilization.paymentDueDate && (
        <SummaryRow
          label="Payment Due"
          value={formatDate(utilization.paymentDueDate)}
        />
      )}
      {utilization.statementBalance && (
        <SummaryRow
          label="Statement Balance"
          value={formatCurrency(utilization.statementBalance)}
        />
      )}
    </Box>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SummaryRowProps {
  label: string;
  value: string;
  color?: string;
}

function SummaryRow({ label, value, color }: SummaryRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} color={color}>
        {value}
      </Typography>
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
