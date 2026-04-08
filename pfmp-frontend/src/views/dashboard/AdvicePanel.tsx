import React from 'react';
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import {
  CheckCircle as AcceptIcon,
  Cancel as DismissIcon,
  TaskAlt as TaskIcon,
} from '@mui/icons-material';
import type { AdviceItem } from '../../services/dashboard';

interface AdvicePanelProps {
  advice: AdviceItem[];
  loading: boolean;
  pendingAdviceId?: number | null;
  onAccept?: (adviceId: number) => void;
  onDismiss?: (adviceId: number) => void;
}

const statusColor: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  Proposed: 'info',
  Accepted: 'success',
  Dismissed: 'warning',
};

export const AdvicePanel: React.FC<AdvicePanelProps> = ({ advice, loading, pendingAdviceId, onAccept, onDismiss }) => {
  if (loading && advice.length === 0) {
    return <Typography variant="body2">Loading advice…</Typography>;
  }

  if (!loading && advice.length === 0) {
    return <Typography variant="body2">No advice generated yet</Typography>;
  }

  return (
    <Stack spacing={1.5} data-testid="advice-panel">
      {advice.slice(0, 5).map((item, idx) => (
        <React.Fragment key={item.adviceId}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              borderRadius: 2,
              border: theme => `1px solid ${theme.palette.divider}`,
              padding: 1.5,
              backgroundColor: 'background.paper',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                color={statusColor[item.status] ?? 'default'}
                label={item.status}
              />
              <Chip size="small" variant="outlined" label={item.theme} />
              {item.confidenceScore != null && (
                <Chip size="small" color="primary" label={`Confidence ${item.confidenceScore}%`} />
              )}
            </Box>
            <Typography variant="subtitle2">{item.consensusText}</Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="caption" color="text.disabled">
                {new Date(item.createdAt).toLocaleString()}
              </Typography>
              {item.status === 'Proposed' && onAccept && onDismiss && (
                <Box display="flex" gap={1}>
                  {pendingAdviceId === item.adviceId ? (
                    <CircularProgress size={20} />
                  ) : (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<AcceptIcon fontSize="small" />}
                        onClick={() => onAccept(item.adviceId)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<DismissIcon fontSize="small" />}
                        onClick={() => onDismiss(item.adviceId)}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                </Box>
              )}
              {item.status === 'Accepted' && item.linkedTaskId != null && (
                <Chip
                  size="small"
                  color="success"
                  icon={<TaskIcon fontSize="small" />}
                  label={`Task #${item.linkedTaskId} created`}
                />
              )}
              {item.status === 'Dismissed' && (
                <Chip size="small" color="default" label="Dismissed" />
              )}
            </Box>
          </Box>
          {idx < Math.min(advice.length, 5) - 1 && <Divider flexItem light />}
        </React.Fragment>
      ))}
      {advice.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, advice.length)} of {advice.length} advice items
        </Typography>
      )}
    </Stack>
  );
};

export default AdvicePanel;