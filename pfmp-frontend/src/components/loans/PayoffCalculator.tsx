/**
 * Payoff Calculator Component
 * Calculate how extra payments affect loan payoff
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Slider,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Savings as SavingsIcon,
  CalendarMonth as CalendarIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { usePayoffCalculator } from '../../hooks/useLoanAnalytics';
import type { LoanDetailsResponse } from '../../api/loanAnalytics';

interface PayoffCalculatorProps {
  loanId: number;
  currentLoan: LoanDetailsResponse;
}

export function PayoffCalculator({ loanId, currentLoan }: PayoffCalculatorProps) {
  const [extraPayment, setExtraPayment] = useState(100);
  const { result, loading, error, calculate } = usePayoffCalculator(loanId);

  // Calculate on initial load and when extra payment changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      calculate(extraPayment);
    }, 300);
    return () => clearTimeout(timer);
  }, [extraPayment, calculate]);

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setExtraPayment(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setExtraPayment(value);
    }
  };

  const maxExtra = Math.round(currentLoan.monthlyPayment * 2); // 2x monthly payment as max

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payoff Calculator
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        See how extra monthly payments can help you pay off your loan faster and save on interest.
      </Typography>

      {/* Extra Payment Input */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          Extra Monthly Payment
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 8 }}>
            <Slider
              value={extraPayment}
              onChange={handleSliderChange}
              min={0}
              max={maxExtra}
              step={25}
              marks={[
                { value: 0, label: '$0' },
                { value: maxExtra / 2, label: formatCurrency(maxExtra / 2) },
                { value: maxExtra, label: formatCurrency(maxExtra) },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => formatCurrency(value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              value={extraPayment}
              onChange={handleInputChange}
              type="number"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
              }}
            />
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          New monthly payment: {formatCurrency(currentLoan.monthlyPayment + extraPayment)}
        </Typography>
      </Box>

      {/* Results */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && !loading && (
        <Grid container spacing={3}>
          {/* Interest Saved */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ResultCard
              icon={<SavingsIcon />}
              title="Interest Saved"
              value={formatCurrency(result.interestSaved)}
              color="success.main"
              subtitle={`${((result.interestSaved / result.totalInterestWithoutExtra) * 100).toFixed(1)}% less interest`}
            />
          </Grid>

          {/* Time Saved */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ResultCard
              icon={<CalendarIcon />}
              title="Time Saved"
              value={`${result.monthsSaved} months`}
              color="primary.main"
              subtitle={`${(result.monthsSaved / 12).toFixed(1)} years earlier payoff`}
            />
          </Grid>

          {/* New Payoff Date */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ResultCard
              icon={<TrendingDownIcon />}
              title="New Payoff Date"
              value={formatDate(result.newPayoffDate)}
              color="info.main"
              subtitle={`Originally: ${formatDate(result.currentPayoffDate)}`}
            />
          </Grid>
        </Grid>
      )}

      {/* Comparison Table */}
      {result && !loading && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Comparison
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: 2,
            bgcolor: 'grey.50',
            p: 2,
            borderRadius: 1,
          }}>
            <Box></Box>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Without Extra
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              With Extra ({formatCurrency(extraPayment)}/mo)
            </Typography>
            
            <Typography variant="body2">Payoff Date</Typography>
            <Typography variant="body2" textAlign="center">
              {formatDate(result.currentPayoffDate)}
            </Typography>
            <Typography variant="body2" textAlign="center" color="success.main" fontWeight={600}>
              {formatDate(result.newPayoffDate)}
            </Typography>
            
            <Typography variant="body2">Total Interest</Typography>
            <Typography variant="body2" textAlign="center">
              {formatCurrency(result.totalInterestWithoutExtra)}
            </Typography>
            <Typography variant="body2" textAlign="center" color="success.main" fontWeight={600}>
              {formatCurrency(result.totalInterestWithExtra)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Quick Presets */}
      <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExtraPayment(50)}
        >
          +$50/mo
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExtraPayment(100)}
        >
          +$100/mo
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExtraPayment(250)}
        >
          +$250/mo
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExtraPayment(500)}
        >
          +$500/mo
        </Button>
      </Box>
    </Paper>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface ResultCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
  subtitle: string;
}

function ResultCard({ icon, title, value, color, subtitle }: ResultCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} color={color}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
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
