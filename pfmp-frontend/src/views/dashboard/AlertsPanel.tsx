import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { DashboardData, AlertCard } from '../../services/dashboard';

interface Props {
  data: DashboardData | null;
  loading: boolean;
}

const severityColor: Record<AlertCard['severity'], 'success' | 'warning' | 'error' | 'default'> = {
  Low: 'success',
  Medium: 'warning',
  High: 'error',
  Critical: 'error',
};

function renderSeverity(severity: AlertCard['severity']) {
  const color = severityColor[severity] ?? 'default';
  return <Chip size="small" color={color} label={severity} />;
}

export const AlertsPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return <Typography variant="body2">Loading alerts…</Typography>;
  }

  if (!loading && (!data || data.alerts.length === 0)) {
    return <Typography variant="body2">No active alerts</Typography>;
  }

  if (!data) {
    return <Typography variant="body2">No alert data available</Typography>;
  }

  return (
    <Stack spacing={1} data-testid="alerts-panel">
      {data.alerts.slice(0, 5).map((alert) => (
        <Box key={alert.alertId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">{alert.title}</Typography>
            {renderSeverity(alert.severity)}
            {alert.isActionable && <Chip size="small" label="Actionable" variant="outlined" />}
          </Box>
          <Typography variant="body2" color="text.secondary">{alert.message}</Typography>
          <Typography variant="caption" color="text.disabled">
            {new Date(alert.createdAt).toLocaleString()}
          </Typography>
        </Box>
      ))}
      {data.alerts.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, data.alerts.length)} of {data.alerts.length} alerts
        </Typography>
      )}
    </Stack>
  );
};

export default AlertsPanel;