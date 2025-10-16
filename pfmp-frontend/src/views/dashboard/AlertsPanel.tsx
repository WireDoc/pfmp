import { Fragment } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  WarningAmberRounded as WarningIcon,
  ErrorOutlineRounded as ErrorIcon,
  InfoOutlined as InfoIcon,
  TaskAlt as TaskIcon,
  CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import type { AlertCard } from '../../services/dashboard';

interface AlertsPanelProps {
  alerts: AlertCard[];
  loading: boolean;
  onCreateTask?: (alert: AlertCard) => void;
}

type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info';

const severityMeta = {
  Low: { color: 'success', Icon: SuccessIcon },
  Medium: { color: 'warning', Icon: InfoIcon },
  High: { color: 'error', Icon: WarningIcon },
  Critical: { color: 'error', Icon: ErrorIcon },
} satisfies Record<AlertCard['severity'], { color: ChipColor; Icon: typeof SuccessIcon }>;

export function AlertsPanel({ alerts, loading, onCreateTask }: AlertsPanelProps) {
  if (loading && alerts.length === 0) {
    return <Typography variant="body2">Loading alerts…</Typography>;
  }

  if (!loading && alerts.length === 0) {
    return <Typography variant="body2">No active alerts</Typography>;
  }

  return (
    <Stack spacing={1.5} data-testid="alerts-panel">
      {alerts.slice(0, 5).map((alert, idx) => {
        const severity = severityMeta[alert.severity] ?? severityMeta.Medium;
        const SeverityIcon = severity.Icon;
        const actionable = alert.isActionable && !alert.isDismissed;
        return (
          <Fragment key={alert.alertId}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                padding: 1.5,
                backgroundColor: alert.isRead ? 'action.hover' : 'background.paper',
                transition: 'background-color 0.2s ease',
              }}
            >
              <Box display="flex" alignItems="flex-start" gap={1} flexWrap="wrap">
                <Chip
                  icon={<SeverityIcon fontSize="small" />}
                  color={severity.color}
                  size="small"
                  label={alert.severity}
                />
                <Chip size="small" variant="outlined" label={alert.category} />
                {alert.isRead && <Chip size="small" variant="outlined" label="Read" />}
                {alert.isDismissed && <Chip size="small" color="default" label="Dismissed" />}
                {alert.isActionable && !alert.isDismissed && (
                  <Chip size="small" color="info" variant="outlined" label="Actionable" />
                )}
              </Box>

              <Box display="flex" flexDirection="column" gap={0.5}>
                <Typography variant="subtitle2">{alert.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {alert.message}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.disabled">
                  {new Date(alert.createdAt).toLocaleString()}
                </Typography>
                {actionable && onCreateTask && (
                  <Tooltip title="Create a follow-up task to track this alert">
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<TaskIcon fontSize="small" />}
                      onClick={() => onCreateTask(alert)}
                    >
                      Create follow-up task
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Box>
            {idx < Math.min(alerts.length, 5) - 1 && <Divider flexItem light />}
          </Fragment>
        );
      })}
      {alerts.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, alerts.length)} of {alerts.length} alerts
        </Typography>
      )}
    </Stack>
  );
}

export default AlertsPanel;