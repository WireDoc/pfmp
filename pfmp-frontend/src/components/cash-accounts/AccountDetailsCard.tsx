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
  account: AccountDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({
  account,
  onEdit,
  onDelete,
  onExport
}) => {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);

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

  // Format percentage
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
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
                {account.accountName}
              </Typography>
            </Box>

            {/* Institution */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Institution
              </Typography>
              <Typography variant="body1">
                {account.institution || 'N/A'}
              </Typography>
            </Box>

            {/* Account Type */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Account Type
              </Typography>
              <Typography variant="body1">
                {account.accountType}
              </Typography>
            </Box>

            {/* Account Number */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Account Number
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontFamily="monospace">
                  {showAccountNumber ? account.accountNumber || 'N/A' : maskAccountNumber(account.accountNumber)}
                </Typography>
                {account.accountNumber && (
                  <IconButton
                    size="small"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    sx={{ ml: 0.5 }}
                  >
                    {showAccountNumber ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Routing Number */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Routing Number
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontFamily="monospace">
                  {showRoutingNumber ? account.routingNumber || 'N/A' : maskAccountNumber(account.routingNumber)}
                </Typography>
                {account.routingNumber && (
                  <IconButton
                    size="small"
                    onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                    sx={{ ml: 0.5 }}
                  >
                    {showRoutingNumber ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Opening Date */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Opening Date
              </Typography>
              <Typography variant="body1">
                {formatDate(account.openingDate)}
              </Typography>
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
                {formatCurrency(account.currentBalance)}
              </Typography>
            </Box>

            {/* Interest Rate / APY */}
            {account.interestRate !== undefined && account.interestRate !== null && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Interest Rate (APY)
                </Typography>
                <Typography variant="body1" color="success.main" fontWeight="medium">
                  {formatPercent(account.interestRate)}
                </Typography>
              </Box>
            )}

            {/* Last Synced */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatRelativeTime(account.lastSyncDate)}
              </Typography>
            </Box>

            {/* Account Status */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={account.status}
                  color={getStatusColor(account.status)}
                  size="small"
                />
              </Box>
            </Box>

            {/* Notes */}
            {account.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {account.notes}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
