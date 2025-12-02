/**
 * Utilization Gauge Component
 * Visual gauge showing credit utilization percentage
 */

import { Box, Typography } from '@mui/material';

interface UtilizationGaugeProps {
  utilizationPercent: number;
  status: 'Good' | 'Fair' | 'Poor';
  color: 'green' | 'yellow' | 'red';
  currentBalance: number;
  creditLimit: number;
}

export function UtilizationGauge({
  utilizationPercent,
  status,
  color,
  currentBalance,
  creditLimit,
}: UtilizationGaugeProps) {
  const colorMap = {
    green: '#4caf50',
    yellow: '#ff9800',
    red: '#f44336',
  };
  
  const gaugeColor = colorMap[color];
  const circumference = 2 * Math.PI * 80;
  // Only fill up to 100%
  const displayPercent = Math.min(utilizationPercent, 100);
  const offset = circumference - (displayPercent / 100) * circumference;
  const availableCredit = creditLimit - currentBalance;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Circular Gauge */}
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
            stroke={gaugeColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
          
          {/* Threshold markers */}
          {/* 30% mark */}
          <line
            x1="100"
            y1="24"
            x2="100"
            y2="16"
            stroke="#4caf50"
            strokeWidth="2"
            transform="rotate(108 100 100)"
          />
          {/* 50% mark */}
          <line
            x1="100"
            y1="24"
            x2="100"
            y2="16"
            stroke="#ff9800"
            strokeWidth="2"
            transform="rotate(180 100 100)"
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
          <Typography variant="h3" fontWeight={700} color={gaugeColor}>
            {utilizationPercent.toFixed(0)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Utilization
          </Typography>
        </Box>
      </Box>

      {/* Status Badge */}
      <Box
        sx={{
          mt: 2,
          px: 2,
          py: 0.5,
          borderRadius: 2,
          bgcolor: `${gaugeColor}20`,
          color: gaugeColor,
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {status}
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 4, mt: 3 }}>
        <LegendItem
          color={gaugeColor}
          label="Balance Used"
          value={formatCurrency(currentBalance)}
        />
        <LegendItem
          color="#e0e0e0"
          label="Available Credit"
          value={formatCurrency(availableCredit)}
        />
      </Box>

      {/* Thresholds Guide */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          width: '100%',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Credit Score Impact
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <ThresholdItem color="#4caf50" label="0-30%" status="Optimal" />
          <ThresholdItem color="#ff9800" label="30-50%" status="Fair" />
          <ThresholdItem color="#f44336" label="50%+" status="Poor" />
        </Box>
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

interface ThresholdItemProps {
  color: string;
  label: string;
  status: string;
}

function ThresholdItem({ color, label, status }: ThresholdItemProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: color,
          mx: 'auto',
          mb: 0.5,
        }}
      />
      <Typography variant="caption" fontWeight={600} display="block">
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {status}
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
