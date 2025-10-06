import React from 'react';
import { Box, Typography } from '@mui/material';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export const AccountsPanel: React.FC<Props> = ({ data, loading }) => {
  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data.accounts.map(a => (
            <li key={a.id}>
              <Typography variant="body2">
                <strong>{a.name}</strong> – ${a.balance.amount.toLocaleString()} ({a.syncStatus})
              </Typography>
            </li>
          ))}
        </Box>
      )}
      {!loading && data && data.accounts.length === 0 && <Typography variant="body2">No accounts</Typography>}
      {!loading && !data && <Typography variant="body2">No account data</Typography>}
    </Box>
  );
};
