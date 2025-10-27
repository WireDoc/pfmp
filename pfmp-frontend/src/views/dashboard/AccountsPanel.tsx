import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { SyncStatusBadge } from '../../components/status/SyncStatusBadge';
import { EmptyState } from '../../components/empty-states/EmptyState';
import type { DashboardData } from '../../services/dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export const AccountsPanel: React.FC<Props> = ({ data, loading }) => {
  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && data.accounts.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.accounts.map(a => (
            <Card key={a.id} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {a.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.institution} · {a.type}
                    </Typography>
                  </Box>
                  <SyncStatusBadge status={a.syncStatus} lastSync={a.lastSync} />
                </Box>
                <Typography variant="h6" color="primary">
                  ${a.balance.amount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {!loading && data && data.accounts.length === 0 && (
        <EmptyState
          icon={AccountBalanceIcon}
          title="No accounts yet"
          description="Connect your bank accounts, credit cards, and investment accounts to see your complete financial picture. You can add accounts manually or link them automatically."
          action={{
            label: 'Add Account',
            onClick: () => {
              // TODO: Navigate to onboarding or account connection flow
              console.log('Add account clicked');
            },
          }}
          secondaryAction={{
            label: 'Learn about account types',
            onClick: () => {
              // TODO: Open help documentation
              console.log('Learn more clicked');
            },
          }}
        />
      )}
      {!loading && !data && <Typography variant="body2">No account data</Typography>}
    </Box>
  );
};
