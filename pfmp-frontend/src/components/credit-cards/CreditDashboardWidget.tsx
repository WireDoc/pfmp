/**
 * Credit Dashboard Widget Component
 * Displays a summary of credit card information for the dashboard
 * Wave 12.5 - Credit Card Features
 */

import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Divider,
  Stack,
  Chip,
  Alert,
  Tooltip
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery } from '@tanstack/react-query';
import { fetchCreditDashboardSummary, type CreditDashboardSummary } from '../../api/loanAnalytics';
import { UtilizationGauge } from './UtilizationGauge';

interface CreditDashboardWidgetProps {
  userId: number;
  onViewDetails?: () => void;
}

export function CreditDashboardWidget({ userId, onViewDetails }: CreditDashboardWidgetProps) {
  const { data, isLoading, error } = useQuery<CreditDashboardSummary>({
    queryKey: ['creditDashboardSummary', userId],
    queryFn: () => fetchCreditDashboardSummary(userId),
    enabled: userId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress size={40} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error">Failed to load credit summary</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasCreditCards) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <CreditCardIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No credit cards linked yet.
              <br />
              Link a credit card to see utilization and payment reminders.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const getUtilizationColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'excellent':
      case 'good':
        return 'success';
      case 'fair':
        return 'warning';
      default:
        return 'error';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilDue = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const dueDate = new Date(dateStr);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilDue = getDaysUntilDue(data.nextPaymentDueDate);
  const isPaymentUrgent = daysUntilDue !== null && daysUntilDue <= 3;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        cursor: onViewDetails ? 'pointer' : 'default',
        '&:hover': onViewDetails ? { boxShadow: 3 } : {}
      }}
      onClick={onViewDetails}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <CreditCardIcon color="primary" />
              <Typography variant="h6">Credit Cards</Typography>
            </Stack>
            <Chip 
              label={`${data.cardCount} card${data.cardCount !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Divider />

          {/* Main Stats */}
          <Stack direction="row" spacing={3} justifyContent="space-around">
            {/* Utilization Gauge */}
            <Box sx={{ textAlign: 'center' }}>
              <UtilizationGauge 
                utilization={data.utilizationPercent} 
                size={80}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Utilization
              </Typography>
              <Chip
                label={data.utilizationStatus}
                size="small"
                color={getUtilizationColor(data.utilizationStatus)}
                sx={{ mt: 0.5 }}
              />
            </Box>

            {/* Credit Available */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="success.main">
                {formatCurrency(data.totalAvailableCredit)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available Credit
              </Typography>
              <Typography variant="caption" color="text.disabled">
                of {formatCurrency(data.totalCreditLimit)}
              </Typography>
            </Box>
          </Stack>

          {/* Balance */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUpIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Current Balance
              </Typography>
            </Stack>
            <Typography variant="body1" fontWeight={600} color="error.main">
              {formatCurrency(data.totalCurrentBalance)}
            </Typography>
          </Stack>

          <Divider />

          {/* Next Payment Due */}
          {data.nextPaymentDueDate && (
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center"
              sx={{
                bgcolor: isPaymentUrgent ? 'error.lighter' : 'transparent',
                borderRadius: 1,
                p: isPaymentUrgent ? 1 : 0,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {isPaymentUrgent ? (
                  <WarningIcon fontSize="small" color="error" />
                ) : (
                  <PaymentIcon fontSize="small" color="action" />
                )}
                <Typography variant="body2" color={isPaymentUrgent ? 'error.main' : 'text.secondary'}>
                  Next Payment
                </Typography>
              </Stack>
              <Tooltip title={data.nextPaymentDueLender || 'Credit Card'}>
                <Stack alignItems="flex-end">
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(data.nextPaymentDueAmount)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color={isPaymentUrgent ? 'error.main' : 'text.secondary'}
                  >
                    Due {formatDate(data.nextPaymentDueDate)}
                    {daysUntilDue !== null && ` (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''})`}
                  </Typography>
                </Stack>
              </Tooltip>
            </Stack>
          )}

          {/* Recommendation (show first one if exists) */}
          {data.recommendations.length > 0 && (
            <Alert 
              severity={data.utilizationPercent > 50 ? 'warning' : 'info'}
              sx={{ py: 0.5 }}
            >
              <Typography variant="caption">
                {data.recommendations[0]}
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CreditDashboardWidget;
