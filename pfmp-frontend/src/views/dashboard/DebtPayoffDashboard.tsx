/**
 * Debt Payoff Dashboard View
 * Compare Avalanche vs Snowball debt payoff strategies
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Grid,
  Slider,
  TextField,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingDown as TrendingDownIcon,
  Psychology as PsychologyIcon,
  AttachMoney as MoneyIcon,
  CalendarMonth as CalendarIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material';
import { useDebtPayoffStrategies } from '../../hooks/useLoanAnalytics';
import { useDevUserId } from '../../dev/devUserState';

export default function DebtPayoffDashboard() {
  const navigate = useNavigate();
  const userId = useDevUserId();
  
  const [extraPayment, setExtraPayment] = useState(200);
  const [selectedStrategy, setSelectedStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [includeAutoLoans, setIncludeAutoLoans] = useState(true);
  const [includeMortgages, setIncludeMortgages] = useState(false);
  
  const { strategies, loading, error, refetch } = useDebtPayoffStrategies(
    userId, 
    extraPayment,
    { includeAutoLoans, includeMortgages }
  );

  const handleExtraPaymentChange = (_event: Event, newValue: number | number[]) => {
    setExtraPayment(newValue as number);
  };

  const handleExtraPaymentCommit = () => {
    refetch(extraPayment, { includeAutoLoans, includeMortgages });
  };

  const handleIncludeAutoLoansChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setIncludeAutoLoans(newValue);
    refetch(extraPayment, { includeAutoLoans: newValue, includeMortgages });
  };

  const handleIncludeMortgagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setIncludeMortgages(newValue);
    refetch(extraPayment, { includeAutoLoans, includeMortgages: newValue });
  };

  const handleStrategyChange = (
    _event: React.MouseEvent<HTMLElement>,
    newStrategy: 'avalanche' | 'snowball' | null
  ) => {
    if (newStrategy) {
      setSelectedStrategy(newStrategy);
    }
  };

  if (!userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No user selected. Please select a dev user from the user switcher.</Alert>
      </Box>
    );
  }

  if (loading && !strategies) {
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

  if (!strategies || strategies.debts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
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
          <Typography color="text.primary">Debt Payoff Strategies</Typography>
        </Breadcrumbs>
        <Alert severity="info">
          No debts found. Add loans or credit cards to see payoff strategies.
        </Alert>
      </Box>
    );
  }

  const { avalanche, snowball, minimumOnly } = strategies;
  const interestSavings = minimumOnly.totalInterest - avalanche.totalInterest;
  const timeSavings = minimumOnly.monthsToPayoff - avalanche.monthsToPayoff;

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
        <Typography color="text.primary">Debt Payoff Strategies</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Debt Payoff Strategies
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Compare different strategies to pay off your {strategies.debts.length} debts totaling{' '}
          <strong>{formatCurrency(strategies.totalDebt)}</strong> at a weighted average rate of{' '}
          <strong>{strategies.weightedAverageInterestRate.toFixed(2)}%</strong>.
        </Typography>

        {/* Extra Payment Slider */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Extra Monthly Payment: {formatCurrency(extraPayment)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ flex: 1, pr: 4 }}>
              <Slider
                value={extraPayment}
                onChange={handleExtraPaymentChange}
                onChangeCommitted={handleExtraPaymentCommit}
                min={0}
                max={1000}
                step={25}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 250, label: '$250' },
                  { value: 500, label: '$500' },
                  { value: 750, label: '$750' },
                  { value: 1000, label: '$1,000' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatCurrency(value)}
              />
            </Box>
            <TextField
              value={extraPayment}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 0) {
                  setExtraPayment(value);
                }
              }}
              onBlur={handleExtraPaymentCommit}
              type="number"
              size="small"
              sx={{ width: 100, flexShrink: 0 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Total monthly payment: {formatCurrency(strategies.totalMinimumPayment + extraPayment)}
          </Typography>
        </Box>

        {/* Debt Type Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeAutoLoans}
                onChange={handleIncludeAutoLoansChange}
                size="small"
              />
            }
            label="Include Auto Loans"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeMortgages}
                onChange={handleIncludeMortgagesChange}
                size="small"
              />
            }
            label="Include Home Loans"
          />
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              icon={<SavingsIcon />}
              title="Potential Interest Savings"
              value={formatCurrency(interestSavings)}
              subtitle="vs. minimum payments only"
              color="success.main"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              icon={<CalendarIcon />}
              title="Time Savings"
              value={`${timeSavings} months`}
              subtitle={`${(timeSavings / 12).toFixed(1)} years earlier`}
              color="primary.main"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              icon={<MoneyIcon />}
              title="Monthly Commitment"
              value={formatCurrency(strategies.totalMinimumPayment + extraPayment)}
              subtitle={`${formatCurrency(strategies.totalMinimumPayment)} min + ${formatCurrency(extraPayment)} extra`}
              color="info.main"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Strategy Comparison */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Strategy Comparison
        </Typography>
        
        <Grid container spacing={3}>
          {/* Avalanche Strategy */}
          <Grid size={{ xs: 12, md: 6 }}>
            <StrategyCard
              strategy={avalanche}
              selected={selectedStrategy === 'avalanche'}
              onClick={() => setSelectedStrategy('avalanche')}
              icon={<TrendingDownIcon />}
              highlight="Saves the most money"
              highlightColor="success"
            />
          </Grid>

          {/* Snowball Strategy */}
          <Grid size={{ xs: 12, md: 6 }}>
            <StrategyCard
              strategy={snowball}
              selected={selectedStrategy === 'snowball'}
              onClick={() => setSelectedStrategy('snowball')}
              icon={<PsychologyIcon />}
              highlight="Quick wins for motivation"
              highlightColor="info"
            />
          </Grid>
        </Grid>

        {/* Comparison Chips */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Chip
            label={`Avalanche saves ${formatCurrency(snowball.totalInterest - avalanche.totalInterest)} more interest`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Snowball pays off first debt ${getFirstPayoffDiff(strategies)} months earlier`}
            color="info"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Debt List & Payoff Order */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Payoff Order
          </Typography>
          <ToggleButtonGroup
            value={selectedStrategy}
            exclusive
            onChange={handleStrategyChange}
            size="small"
          >
            <ToggleButton value="avalanche">
              <TrendingDownIcon sx={{ mr: 0.5 }} fontSize="small" />
              Avalanche
            </ToggleButton>
            <ToggleButton value="snowball">
              <PsychologyIcon sx={{ mr: 0.5 }} fontSize="small" />
              Snowball
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Debt</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">APR</TableCell>
                <TableCell align="right">Min Payment</TableCell>
                <TableCell align="center">Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getOrderedDebts(strategies, selectedStrategy).map((debt, index) => (
                <TableRow
                  key={debt.liabilityAccountId}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => {
                    const route = debt.liabilityType.includes('credit') ? 'credit-cards' : 'loans';
                    navigate(`/dashboard/${route}/${debt.liabilityAccountId}`);
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {debt.lender}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatLiabilityType(debt.liabilityType)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(debt.balance)}</TableCell>
                  <TableCell align="right">{debt.interestRate.toFixed(2)}%</TableCell>
                  <TableCell align="right">{formatCurrency(debt.minimumPayment)}</TableCell>
                  <TableCell align="center">
                    {index === 0 ? (
                      <Chip label="Focus" size="small" color="primary" />
                    ) : (
                      <Chip label={`#${index + 1}`} size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Strategy Explanation */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {selectedStrategy === 'avalanche' ? 'Avalanche Method' : 'Snowball Method'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedStrategy === 'avalanche'
              ? 'Focus extra payments on the highest interest rate debt first. This minimizes total interest paid over time, saving you the most money mathematically.'
              : 'Focus extra payments on the smallest balance first. This creates quick wins and builds momentum, which can help with motivation and behavior change.'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

function SummaryCard({ icon, title, value, subtitle, color }: SummaryCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} color={color}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface StrategyCardProps {
  strategy: {
    name: string;
    description: string;
    payoffDate: string;
    totalInterest: number;
    totalCost: number;
    monthsToPayoff: number;
  };
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  highlight: string;
  highlightColor: 'success' | 'info' | 'warning' | 'error';
}

function StrategyCard({ strategy, selected, onClick, icon, highlight, highlightColor }: StrategyCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: selected ? 2 : 1,
        borderColor: selected ? `${highlightColor}.main` : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: `${highlightColor}.main`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: `${highlightColor}.main` }}>{icon}</Box>
            <Typography variant="h6" fontWeight={600}>
              {strategy.name}
            </Typography>
          </Box>
          <Chip label={highlight} size="small" color={highlightColor} />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {strategy.description}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" display="block">
              Payoff Date
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {formatDate(strategy.payoffDate)}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" display="block">
              Months to Payoff
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {strategy.monthsToPayoff}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Interest
            </Typography>
            <Typography variant="body1" fontWeight={600} color="warning.main">
              {formatCurrency(strategy.totalInterest)}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Cost
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {formatCurrency(strategy.totalCost)}
            </Typography>
          </Grid>
        </Grid>
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

function formatLiabilityType(type: string): string {
  const typeMap: Record<string, string> = {
    mortgage: 'Mortgage',
    auto_loan: 'Auto Loan',
    student_loan: 'Student Loan',
    personal_loan: 'Personal Loan',
    credit_card: 'Credit Card',
    'credit-card': 'Credit Card',
  };
  return typeMap[type] || type;
}

interface DebtItem {
  liabilityAccountId: number;
  liabilityType: string;
  lender: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

interface Strategies {
  debts: DebtItem[];
  avalanche: { payoffOrder: number[] };
  snowball: { payoffOrder: number[] };
}

function getOrderedDebts(strategies: Strategies, strategy: 'avalanche' | 'snowball'): DebtItem[] {
  const order = strategy === 'avalanche' ? strategies.avalanche.payoffOrder : strategies.snowball.payoffOrder;
  return order.map(id => strategies.debts.find(d => d.liabilityAccountId === id)!).filter(Boolean);
}

function getFirstPayoffDiff(strategies: Strategies): number {
  // Use actual first debt payoff month from simulation
  const avalancheFirst = strategies.avalanche.firstDebtPayoffMonth;
  const snowballFirst = strategies.snowball.firstDebtPayoffMonth;
  
  // Snowball typically pays off first debt faster (lower balance first)
  return Math.max(0, avalancheFirst - snowballFirst);
}
