/**
 * Loan Account Detail View
 * Displays loan details, amortization schedule, and payoff calculator
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LoanSummaryHeader } from '../../components/loans/LoanSummaryHeader';
import { AmortizationTable } from '../../components/loans/AmortizationTable';
import { PayoffCalculator } from '../../components/loans/PayoffCalculator';
import { LoanProgressChart } from '../../components/loans/LoanProgressChart';
import { useAmortizationSchedule } from '../../hooks/useLoanAnalytics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`loan-tabpanel-${index}`}
      aria-labelledby={`loan-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LoanAccountDetailView() {
  const { liabilityId } = useParams<{ liabilityId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  
  const loanId = liabilityId ? Number(liabilityId) : null;
  const { schedule, loading, error } = useAmortizationSchedule(loanId);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!liabilityId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid loan ID</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!schedule) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Loan not found</Alert>
      </Box>
    );
  }

  const { loanDetails } = schedule;

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">
          {loanDetails.lender} - {formatLoanType(loanDetails.liabilityType)}
        </Typography>
      </Breadcrumbs>

      {/* Loan Summary Header */}
      <LoanSummaryHeader loan={loanDetails} />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Amortization Schedule" />
          <Tab label="Payoff Calculator" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Loan Progress
              </Typography>
              <LoanProgressChart 
                percentPaidOff={loanDetails.percentPaidOff}
                originalAmount={loanDetails.originalAmount}
                currentBalance={loanDetails.currentBalance}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Payment Summary
              </Typography>
              <Box sx={{ mt: 2 }}>
                <SummaryRow 
                  label="Monthly Payment" 
                  value={formatCurrency(loanDetails.monthlyPayment)} 
                />
                <SummaryRow 
                  label="Total Interest Paid" 
                  value={formatCurrency(loanDetails.totalInterestPaid)} 
                  color="warning.main"
                />
                <SummaryRow 
                  label="Total Interest Remaining" 
                  value={formatCurrency(loanDetails.totalInterestRemaining)} 
                />
                <SummaryRow 
                  label="Payments Remaining" 
                  value={`${loanDetails.paymentsRemaining} months`} 
                />
                <SummaryRow 
                  label="Est. Payoff Date" 
                  value={formatDate(loanDetails.estimatedPayoffDate)} 
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Amortization Schedule Tab */}
      <TabPanel value={tabValue} index={1}>
        <AmortizationTable schedule={schedule} />
      </TabPanel>

      {/* Payoff Calculator Tab */}
      <TabPanel value={tabValue} index={2}>
        <PayoffCalculator loanId={loanId!} currentLoan={loanDetails} />
      </TabPanel>
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
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
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
