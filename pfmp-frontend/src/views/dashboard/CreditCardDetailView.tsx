/**
 * Credit Card Detail View
 * Displays credit card details with utilization gauge
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Grid,
  Chip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CreditCard as CreditCardIcon } from '@mui/icons-material';
import { UtilizationGauge } from '../../components/credit-cards/UtilizationGauge';
import { CreditCardSummary } from '../../components/credit-cards/CreditCardSummary';
import { useCreditUtilization } from '../../hooks/useLoanAnalytics';

export default function CreditCardDetailView() {
  const { liabilityId } = useParams<{ liabilityId: string }>();
  const navigate = useNavigate();
  
  const cardId = liabilityId ? Number(liabilityId) : null;
  const { utilization, loading, error } = useCreditUtilization(cardId);

  if (!liabilityId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid credit card ID</Alert>
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

  if (!utilization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Credit card not found</Alert>
      </Box>
    );
  }

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
          {utilization.lender || 'Credit Card'}
        </Typography>
      </Breadcrumbs>

      {/* Header Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'info.light',
              color: 'info.contrastText',
            }}
          >
            <CreditCardIcon sx={{ fontSize: 32 }} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h5" fontWeight={600}>
                {utilization.lender || 'Credit Card'}
              </Typography>
              <Chip 
                label="Credit Card" 
                size="small" 
                color="info" 
                variant="outlined" 
              />
            </Box>
            {utilization.interestRate && (
              <Typography variant="body2" color="text.secondary">
                {utilization.interestRate.toFixed(2)}% APR
              </Typography>
            )}
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight={700} color="error.main">
              {formatCurrency(utilization.currentBalance)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current Balance
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Utilization Gauge */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Credit Utilization
            </Typography>
            <UtilizationGauge
              utilizationPercent={utilization.utilizationPercent}
              status={utilization.utilizationStatus}
              color={utilization.utilizationColor}
              currentBalance={utilization.currentBalance}
              creditLimit={utilization.creditLimit}
            />
          </Paper>
        </Grid>

        {/* Card Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Card Details
            </Typography>
            <CreditCardSummary utilization={utilization} />
          </Paper>
        </Grid>

        {/* Recommendations */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            <UtilizationRecommendations
              utilizationPercent={utilization.utilizationPercent}
              status={utilization.utilizationStatus}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface UtilizationRecommendationsProps {
  utilizationPercent: number;
  status: 'Good' | 'Fair' | 'Poor';
}

function UtilizationRecommendations({ utilizationPercent, status }: UtilizationRecommendationsProps) {
  const recommendations = getRecommendations(utilizationPercent, status);

  return (
    <Box>
      {recommendations.map((rec, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            py: 1,
            borderBottom: index < recommendations.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Chip
            label={rec.priority}
            size="small"
            color={rec.priority === 'High' ? 'error' : rec.priority === 'Medium' ? 'warning' : 'success'}
            sx={{ minWidth: 60 }}
          />
          <Typography variant="body2">{rec.text}</Typography>
        </Box>
      ))}
    </Box>
  );
}

interface Recommendation {
  priority: 'High' | 'Medium' | 'Low';
  text: string;
}

function getRecommendations(utilizationPercent: number, status: string): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (status === 'Poor' || utilizationPercent > 50) {
    recommendations.push({
      priority: 'High',
      text: 'Your credit utilization is above 50%. Consider paying down your balance to improve your credit score.',
    });
    recommendations.push({
      priority: 'Medium',
      text: 'Request a credit limit increase to lower your utilization ratio without changing spending habits.',
    });
  }

  if (status === 'Fair' || (utilizationPercent > 30 && utilizationPercent <= 50)) {
    recommendations.push({
      priority: 'Medium',
      text: 'Your utilization is between 30-50%. Aim to reduce it below 30% for optimal credit health.',
    });
  }

  if (status === 'Good' && utilizationPercent <= 30) {
    recommendations.push({
      priority: 'Low',
      text: 'Great job! Your credit utilization is in the optimal range. Keep it below 30% to maintain a healthy credit score.',
    });
  }

  recommendations.push({
    priority: 'Low',
    text: 'Consider setting up automatic payments to avoid late fees and maintain a good payment history.',
  });

  return recommendations;
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
