/**
 * Loan Progress Chart Component
 * Visual representation of loan payoff progress
 */

import { Box, Typography } from '@mui/material';

interface LoanProgressChartProps {
  percentPaidOff: number;
  originalAmount: number;
  currentBalance: number;
}

export function LoanProgressChart({ percentPaidOff, originalAmount, currentBalance }: LoanProgressChartProps) {
  const paidAmount = originalAmount - currentBalance;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (percentPaidOff / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Circular Progress */}
      <Box sx={{ position: 'relative', width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="16"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#4caf50"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        
        {/* Center Text */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" fontWeight={700} color="success.main">
            {percentPaidOff.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paid Off
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 4, mt: 3 }}>
        <LegendItem
          color="#4caf50"
          label="Principal Paid"
          value={formatCurrency(paidAmount)}
        />
        <LegendItem
          color="#e0e0e0"
          label="Remaining Balance"
          value={formatCurrency(currentBalance)}
        />
      </Box>
    </Box>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface LegendItemProps {
  color: string;
  label: string;
  value: string;
}

function LegendItem({ color, label, value }: LegendItemProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: color,
        }}
      />
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
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
