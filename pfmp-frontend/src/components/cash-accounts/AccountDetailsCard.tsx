import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility,
  VisibilityOff,
  Edit,
  Delete,
  FileDownload
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { CashAccountResponse } from '../../services/cashAccountsApi';

export interface AccountDetails {
  accountId: number;
  accountName: string;
  institution?: string;
  accountType: string;
  accountNumber?: string;
  routingNumber?: string;
  currentBalance: number;
  interestRate?: number;
  openingDate?: string;
  lastSyncDate?: string;
  status: string;
  notes?: string;
}

interface AccountDetailsCardProps {
  account: AccountDetails | CashAccountResponse;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

// Type guard to check if account is CashAccountResponse
function isCashAccountResponse(account: AccountDetails | CashAccountResponse): account is CashAccountResponse {
  return 'cashAccountId' in account;
}

export const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({
  account,
  onEdit,
  onDelete,
  onExport
}) => {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);

  // Normalize account data to common format
  const isCashAccount = isCashAccountResponse(account);
  const accountName = isCashAccount ? (account.nickname || 'Cash Account') : account.accountName;
  const currentBalance = isCashAccount ? account.balance : account.currentBalance;
  const institution = isCashAccount ? account.institution : (account.institution || 'N/A');
  const accountType = account.accountType;
  const lastSyncDate = isCashAccount ? account.updatedAt : account.lastSyncDate;
  const openingDate = isCashAccount ? account.createdAt : account.openingDate;
  const accountNumber = isCashAccount ? account.accountNumber : account.accountNumber;
  const routingNumber = isCashAccount ? account.routingNumber : account.routingNumber;
  const status = isCashAccount ? 'Active' : account.status;
  const notes = isCashAccount ? account.purpose : account.notes;

  // Debug logging
  console.log('AccountDetailsCard - account data:', {
    isCashAccount,
    accountNumber,
    routingNumber,
    rawAccountNumber: account.accountNumber,
    rawRoutingNumber: (account as any).routingNumber,
    fullAccount: account
  });

  // Mask account number (show last 4 digits)
  const maskAccountNumber = (number: string | undefined) => {
    if (!number) return 'N/A';
    if (number.length <= 4) return number;
    return `****${number.slice(-4)}`;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Less than 1 hour ago';
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
      return formatDate(dateString);
    } catch {
      return 'Invalid date';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header with Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Account Details</Typography>
          
          <Box>
            {onExport && (
              <Tooltip title="Export transactions">
                <IconButton size="small" onClick={onExport}>
                  <FileDownload />
                </IconButton>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title="Edit account">
                <IconButton size="small" onClick={onEdit}>
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete account">
                <IconButton size="small" onClick={onDelete} color="error">
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            {/* Account Name */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Account Name
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {accountName}
              </Typography>
            </Box>

            {/* Institution */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Institution
              </Typography>
              <Typography variant="body1">
                {institution}
              </Typography>
            </Box>

            {/* Account Type */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Account Type
              </Typography>
              <Typography variant="body1">
                {accountType}
              </Typography>
            </Box>

            {/* Notes / Purpose */}
            {notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {isCashAccount ? 'Purpose' : 'Notes'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {notes}
                </Typography>
              </Box>
            )}

            {/* Account Status */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={status}
                  color={getStatusColor(status)}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>

          {/* Right Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            {/* Current Balance */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Current Balance
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatCurrency(currentBalance)}
              </Typography>
            </Box>

            {/* Account Number */}
            {accountNumber && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Account Number
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontFamily="monospace">
                    {showAccountNumber ? accountNumber : maskAccountNumber(accountNumber)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    sx={{ ml: 0.5 }}
                  >
                    {showAccountNumber ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Routing Number */}
            {routingNumber && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Routing Number
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontFamily="monospace">
                    {showRoutingNumber ? routingNumber : maskAccountNumber(routingNumber)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                    sx={{ ml: 0.5 }}
                  >
                    {showRoutingNumber ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Opening Date */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {isCashAccount ? 'Created Date' : 'Opening Date'}
              </Typography>
              <Typography variant="body1">
                {formatRelativeTime(openingDate)}
              </Typography>
            </Box>

            {/* Last Synced */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatRelativeTime(lastSyncDate)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
