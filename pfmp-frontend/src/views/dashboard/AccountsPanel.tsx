import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, IconButton } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { SyncStatusBadge } from '../../components/status/SyncStatusBadge';
import { EmptyState } from '../../components/empty-states/EmptyState';
import { CashAccountModal } from '../../components/accounts/CashAccountModal';
import { AccountModal } from '../../components/accounts/AccountModal';
import { CsvImportModal } from '../../components/accounts/CsvImportModal';
import { createCashAccount, updateCashAccount, getCashAccount, deleteCashAccount, type CreateCashAccountRequest, type UpdateCashAccountRequest, type CashAccountResponse } from '../../services/cashAccountsApi';
import { getAccount, updateAccount, deleteAccount, type AccountResponse, type UpdateAccountRequest } from '../../services/accountsApi';
import type { DashboardData } from '../../services/dashboard';
import type { AccountSnapshot } from '../../services/dashboard/types';

interface Props { 
  data: DashboardData | null; 
  loading: boolean;
  userId: number;
  onRefresh?: () => void;
}

export const AccountsPanel: React.FC<Props> = ({ data, loading, userId, onRefresh }) => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccountResponse | null>(null);
  const [editingNewAccount, setEditingNewAccount] = useState<AccountResponse | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Show all accounts (cash, investments, crypto, etc.)
  const allAccounts = data?.accounts || [];

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const handleOpenCsvImport = () => {
    setCsvImportOpen(true);
  };

  const handleCloseCsvImport = () => {
    setCsvImportOpen(false);
  };

  const handleCsvImportSuccess = () => {
    // Refresh dashboard to show newly imported accounts
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleViewAccount = (account: AccountSnapshot) => {
    // Check if this is a UUID-based cash account
    if (account.isCashAccount) {
      navigate(`/dashboard/cash-accounts/${account.id}`);
      return;
    }
    
    // Navigate to account detail view for accounts with integer IDs
    if (typeof account.id === 'number' || !isNaN(Number(account.id))) {
      navigate(`/dashboard/accounts/${account.id}`);
    } else {
      console.warn('Cannot navigate to detail view for account:', account.id);
    }
  };

  const handleOpenEditModal = async (account: AccountSnapshot) => {
    // Check if this is a UUID-based cash account
    if (account.isCashAccount) {
      setLoadingAccount(true);
      try {
        // ID is already the cash account UUID
        const fullAccount = await getCashAccount(account.id);
        setEditingAccount(fullAccount);
        setModalOpen(true);
      } catch (error) {
        console.error('Failed to load cash account details:', error);
        // Fall back to basic data from dashboard if API fails
        const cashAccountData: CashAccountResponse = {
          cashAccountId: account.id,
          userId,
          institution: account.institution,
          nickname: account.name,
          accountType: 'checking',
          balance: account.balance.amount,
          interestRateApr: 0,
          purpose: undefined,
          isEmergencyFund: false,
          createdAt: account.lastSync,
          updatedAt: account.lastSync,
        };
        setEditingAccount(cashAccountData);
        setModalOpen(true);
      } finally {
        setLoadingAccount(false);
      }
      return;
    }
    
    // Investment/other accounts with integer IDs - fetch from Accounts API
    const accountIdNum = typeof account.id === 'number' ? account.id : parseInt(account.id, 10);
    if (!isNaN(accountIdNum)) {
      setLoadingAccount(true);
      try {
        const fullAccount = await getAccount(accountIdNum);
        setEditingNewAccount(fullAccount);
      } catch (error) {
        console.error('Failed to load account details:', error);
      } finally {
        setLoadingAccount(false);
      }
      return;
    }
    
    console.warn('Unknown account ID format:', account.id);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
  };

  const handleCloseNewAccountModal = () => {
    setEditingNewAccount(null);
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

  const handleSaveNewAccount = async (accountId: number, request: UpdateAccountRequest) => {
    await updateAccount(accountId, request);
    
    // Refresh dashboard data
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDelete = async (accountId: string) => {
    await deleteCashAccount(accountId);
    
    // Refresh dashboard data
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDeleteNewAccount = async (accountId: number) => {
    await deleteAccount(accountId);
    
    // Refresh dashboard data
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Box data-testid="accounts-panel">
      {loading && !data && <Typography variant="body2">Loading accounts...</Typography>}
      {!loading && data && allAccounts.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Accounts
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={handleOpenCsvImport}
              >
                Import CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenAddModal}
              >
                Add Account
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allAccounts.map(a => (
            <Card key={a.id} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box flex={1}>
                    <Typography 
                      variant="subtitle1" 
                      fontWeight="medium"
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline', color: 'primary.main' }
                      }}
                      onClick={() => handleViewAccount(a)}
                    >
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
                      onClick={() => handleViewAccount(a)} 
                      aria-label="View account details"
                      title="View details"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenEditModal(a)} 
                      aria-label="Edit account"
                      title="Edit account"
                      disabled={loadingAccount}
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
        </>
      )}
      {!loading && data && allAccounts.length === 0 && (
        <EmptyState
          icon={AccountBalanceIcon}
          title="No accounts yet"
          description="Add your checking, savings, and investment accounts to track your financial portfolio."
          action={{
            label: 'Add Account',
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
        onDelete={handleDelete}
      />
      
      <AccountModal
        open={!!editingNewAccount}
        account={editingNewAccount}
        onClose={handleCloseNewAccountModal}
        onSave={handleSaveNewAccount}
        onDelete={handleDeleteNewAccount}
      />
      
      <CsvImportModal
        open={csvImportOpen}
        userId={userId}
        onClose={handleCloseCsvImport}
        onSuccess={handleCsvImportSuccess}
      />
    </Box>
  );
};
