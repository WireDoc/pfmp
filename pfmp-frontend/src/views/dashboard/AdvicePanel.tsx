import React from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { AdviceItem } from '../../services/dashboard';

interface AdvicePanelProps {
  advice: AdviceItem[];
  loading: boolean;
}

const statusColor: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  Proposed: 'info',
  Accepted: 'success',
  Dismissed: 'warning',
};

export const AdvicePanel: React.FC<AdvicePanelProps> = ({ advice, loading }) => {
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
            <Typography variant="caption" color="text.disabled">
              {new Date(item.createdAt).toLocaleString()}
            </Typography>
            {item.linkedTaskId != null && (
              <Typography variant="caption" color="text.secondary">
                Linked task #{item.linkedTaskId}
              </Typography>
            )}
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