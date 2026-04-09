import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, List, ListItem, ListItemText,
  LinearProgress, Box, Chip, Skeleton,
} from '@mui/material';
import { fetchUpcomingObligations, type UpcomingObligationsData } from '../../services/dashboard/overviewApi';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

export const UpcomingObligationsWidget: React.FC = () => {
  const [data, setData] = useState<UpcomingObligationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingObligations(3)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 2 }} data-testid="obligations-loading">
        <Skeleton variant="text" width={200} height={32} />
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1 }} />)}
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 2 }} data-testid="obligations-error">
        <Typography variant="h6" gutterBottom>Upcoming Obligations</Typography>
        <Typography color="error">Unable to load obligations</Typography>
      </Paper>
    );
  }

  if (data.obligations.length === 0) {
    return (
      <Paper sx={{ p: 2 }} data-testid="obligations-empty">
        <Typography variant="h6" gutterBottom>Upcoming Obligations</Typography>
        <Typography variant="body2" color="text.secondary">No upcoming obligations</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }} data-testid="obligations-widget">
      <Typography variant="h6" gutterBottom>Upcoming Obligations</Typography>
      <List dense disablePadding>
        {data.obligations.map(o => (
          <ListItem key={o.id} disableGutters sx={{ flexDirection: 'column', alignItems: 'stretch', mb: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <ListItemText
                primary={o.name}
                secondary={`${formatDate(o.targetDate)} · $${o.estimatedCost.toLocaleString()}`}
              />
              <Box display="flex" gap={0.5}>
                {o.isCritical && <Chip label="Critical" size="small" color="error" />}
                <Chip label={`${o.fundingProgressPct}%`} size="small" color={o.fundingProgressPct >= 75 ? 'success' : o.fundingProgressPct >= 40 ? 'warning' : 'default'} />
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(o.fundingProgressPct, 100)}
              sx={{
                height: 6, borderRadius: 3, mt: 0.5,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': { borderRadius: 3 },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
