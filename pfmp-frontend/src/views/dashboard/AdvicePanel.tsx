import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { DashboardData } from '../../services/dashboard';

interface Props {
  data: DashboardData | null;
  loading: boolean;
}

export const AdvicePanel: React.FC<Props> = ({ data, loading }) => {
  if (loading && !data) {
    return <Typography variant="body2">Loading advice…</Typography>;
  }

  if (!loading && (!data || data.advice.length === 0)) {
    return <Typography variant="body2">No advice generated yet</Typography>;
  }

  if (!data) {
    return <Typography variant="body2">No advice data available</Typography>;
  }

  return (
    <Stack spacing={1} data-testid="advice-panel">
      {data.advice.slice(0, 5).map((item) => (
        <Box key={item.adviceId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">{item.theme}</Typography>
            <Chip size="small" label={item.status} variant="outlined" />
            {item.confidenceScore != null && (
              <Chip size="small" color="primary" label={`Confidence ${item.confidenceScore}%`} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">{item.consensusText}</Typography>
          <Typography variant="caption" color="text.disabled">
            {new Date(item.createdAt).toLocaleString()}
          </Typography>
        </Box>
      ))}
      {data.advice.length > 5 && (
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(5, data.advice.length)} of {data.advice.length} advice items
        </Typography>
      )}
    </Stack>
  );
};

export default AdvicePanel;