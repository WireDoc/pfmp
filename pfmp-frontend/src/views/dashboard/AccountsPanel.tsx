import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { SyncStatusBadge } from '../../components/status/SyncStatusBadge';
import { EmptyState } from '../../components/empty-states/EmptyState';
import type { DashboardData } from '../../services/dashboard';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface Props { 
  data: DashboardData | null; 
  loading: boolean;
  userId: number;
  onRefresh?: () => void;
}

export const AccountsPanel: React.FC<Props> = ({ data, loading, onRefresh }) => {
  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && data.accounts.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Your Accounts
            </Typography>
            {/* Add Account button removed - accounts managed through onboarding */}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.accounts.map(a => (
            <Card key={a.id} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {a.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.institution} · {a.type}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SyncStatusBadge status={a.syncStatus} lastSync={a.lastSync} />
                    {/* Edit button removed - accounts managed through onboarding */}
                  </Box>
                </Box>
                <Typography variant="h6" color="primary">
                  ${a.balance.amount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
          </Box>
        </>
      )}
      {!loading && data && data.accounts.length === 0 && (
        <EmptyState
          icon={AccountBalanceIcon}
          title="No accounts yet"
          description="Complete the onboarding process to add your accounts and see your complete financial picture."
          action={{
            label: 'Go to Onboarding',
            onClick: () => window.location.href = '/onboarding',
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
