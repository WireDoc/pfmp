import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, LinearProgress, Tooltip, Skeleton } from '@mui/material';
import { fetchHealthScore, type HealthScoreData } from '../../services/dashboard/overviewApi';

function scoreColor(score: number): string {
  if (score >= 80) return '#4caf50'; // green
  if (score >= 60) return '#ff9800'; // orange
  if (score >= 40) return '#ffc107'; // amber
  return '#f44336'; // red
}

interface CircularGaugeProps {
  score: number;
  size?: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ score, size = 120 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold" color={color}>{score}</Typography>
      </Box>
    </Box>
  );
};

const breakdownLabels: Record<string, string> = {
  emergencyFund: 'Emergency Fund',
  debtToIncome: 'Debt-to-Income',
  savingsRate: 'Savings Rate',
  insuranceCoverage: 'Insurance',
  diversification: 'Diversification',
  goalProgress: 'Goal Progress',
};

export const HealthScoreWidget: React.FC = () => {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthScore()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 2 }} data-testid="health-score-loading">
        <Skeleton variant="text" width={180} height={32} />
        <Box display="flex" justifyContent="center" py={2}><Skeleton variant="circular" width={120} height={120} /></Box>
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={24} sx={{ mb: 1 }} />)}
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 2 }} data-testid="health-score-error">
        <Typography variant="h6" gutterBottom>Financial Health Score</Typography>
        <Typography color="error">Unable to load health score</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }} data-testid="health-score-widget">
      <Typography variant="h6" gutterBottom>Financial Health Score</Typography>
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <Box display="flex" flexDirection="column" alignItems="center">
          <CircularGauge score={data.overallScore} />
          <Typography variant="subtitle1" fontWeight="medium" sx={{ mt: 1 }} color={scoreColor(data.overallScore)}>
            {data.grade}
          </Typography>
        </Box>
        <Stack spacing={1} sx={{ flex: 1, minWidth: 200 }}>
          {Object.entries(data.breakdown).map(([key, item]) => (
            <Tooltip key={key} title={`${item.score}/100 (weight: ${item.weight}%)`} arrow>
              <Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption">{breakdownLabels[key] || key}</Typography>
                  <Typography variant="caption" fontWeight="bold">{item.score}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.score}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: scoreColor(item.score), borderRadius: 3 },
                  }}
                />
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
};
