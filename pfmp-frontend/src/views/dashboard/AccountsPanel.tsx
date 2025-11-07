import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { SyncStatusBadge } from '../../components/status/SyncStatusBadge';
import { EmptyState } from '../../components/empty-states/EmptyState';
import { CashAccountModal } from '../../components/accounts/CashAccountModal';
import { createCashAccount, updateCashAccount, type CreateCashAccountRequest, type UpdateCashAccountRequest, type CashAccountResponse } from '../../services/cashAccountsApi';
import type { DashboardData } from '../../services/dashboard';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface Props { 
  data: DashboardData | null; 
  loading: boolean;
  userId: number;
  onRefresh?: () => void;
}

export const AccountsPanel: React.FC<Props> = ({ data, loading, userId, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccountResponse | null>(null);

  // Filter to show only cash accounts (investments/TSP managed elsewhere)
  const cashAccounts = data?.accounts.filter(a => a.type === 'cash') || [];

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (account: AccountSnapshot) => {
    // Convert AccountSnapshot to CashAccountResponse for editing
    // Extract Guid from id format: "cash_{guid}"
    const cashAccountId = account.id.replace('cash_', '');
    
    const cashAccountData: CashAccountResponse = {
      cashAccountId,
      userId,
      institution: account.institution,
      nickname: account.name,
      accountType: 'checking', // Default, will be loaded from API if needed
      balance: account.balance.amount,
      interestRateApr: 0,
      purpose: undefined,
      isEmergencyFund: false,
      createdAt: account.lastSync,
      updatedAt: account.lastSync,
    };
    
    setEditingAccount(cashAccountData);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
  };

  const handleSave = async (request: CreateCashAccountRequest | UpdateCashAccountRequest, accountId?: string) => {
    if (accountId) {
      // Update existing account
      await updateCashAccount(accountId, request as UpdateCashAccountRequest);
    } else {
      // Create new account
      await createCashAccount(request as CreateCashAccountRequest);
    }
    
    // Refresh dashboard data
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && cashAccounts.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Cash Accounts
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAddModal}
            >
              Add Cash Account
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cashAccounts.map(a => (
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
                    <IconButton size="small" onClick={() => handleOpenEditModal(a)} aria-label="Edit account">
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
        </>
      )}
      {!loading && data && cashAccounts.length === 0 && (
        <EmptyState
          icon={AccountBalanceIcon}
          title="No cash accounts yet"
          description="Add your checking and savings accounts to track your liquid assets and monitor your cash flow."
          action={{
            label: 'Add Cash Account',
            onClick: handleOpenAddModal,
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
      
      <CashAccountModal
        open={modalOpen}
        userId={userId}
        account={editingAccount}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </Box>
  );
};
