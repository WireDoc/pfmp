import React from 'react';
import { Box, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { EmptyState } from '../../components/empty-states/EmptyState';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export const InsightsPanel: React.FC<Props> = ({ data, loading }) => {
  return (
    <Box data-testid="insights-panel">
      {loading && !data && <Typography variant="body2">Loading insights...</Typography>}
      {!loading && data && data.insights.length > 0 && (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data.insights.map(i => (
            <li key={i.id}>
              <Typography variant="body2"><strong>{i.title}</strong> – {i.body}</Typography>
            </li>
          ))}
        </Box>
      )}
      {!loading && data && data.insights.length === 0 && (
        <EmptyState
          icon={LightbulbIcon}
          title="No insights yet"
          description="We're analyzing your financial data to generate personalized insights and recommendations. Check back soon for tips on optimizing your finances."
        />
      )}
      {!loading && !data && <Typography variant="body2">No insight data</Typography>}
    </Box>
  );
};
