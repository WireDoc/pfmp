import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, IconButton } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import { SyncStatusBadge } from '../../components/status/SyncStatusBadge';
import { EmptyState } from '../../components/empty-states/EmptyState';
import { AccountDetailModal, type AccountUpdateData } from '../../components/accounts/AccountDetailModal';
import type { DashboardData } from '../../services/dashboard';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface Props { 
  data: DashboardData | null; 
  loading: boolean;
  onRefresh?: () => void;
}

export const AccountsPanel: React.FC<Props> = ({ data, loading, onRefresh }) => {
  const [selectedAccount, setSelectedAccount] = useState<AccountSnapshot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleEditClick = (account: AccountSnapshot) => {
    setSelectedAccount(account);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedAccount(null);
  };

  const handleSave = async (updateData: AccountUpdateData) => {
    try {
      const response = await fetch(`/api/accounts/${updateData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updateData.name,
          institution: updateData.institution,
          type: updateData.type,
          balance: updateData.balance,
          accountNumber: updateData.accountNumber,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update account');
      }

      // Refresh dashboard data after successful save
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  };
  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && data.accounts.length > 0 && (
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
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(a)}
                      aria-label="Edit account"
                      sx={{ ml: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
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
      
      <AccountDetailModal
        open={modalOpen}
        account={selectedAccount}
        onClose={handleModalClose}
        onSave={handleSave}
      />
    </Box>
  );
};
