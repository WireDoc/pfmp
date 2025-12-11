/**
 * ConnectedBanksList Component (Wave 11)
 * 
 * Displays a list of connected bank accounts with sync status and actions.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  List,
  ListItem,
  Divider,
  CircularProgress,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  getConnectionAccounts,
  syncConnection,
  disconnectConnection,
  getStatusLabel,
  getStatusColor,
  formatSyncTime,
} from '../../services/plaidApi';
import type { PlaidConnection, PlaidAccount, ConnectionStatus } from '../../services/plaidApi';

interface ConnectedBanksListProps {
  connections: PlaidConnection[];
  onRefresh: () => void;
  onDisconnect?: (connectionId: string) => void;
}

export const ConnectedBanksList: React.FC<ConnectedBanksListProps> = ({
  connections,
  onRefresh,
  onDisconnect,
}) => {
  if (connections.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No bank accounts connected yet. Click "Link Bank Account" to get started.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {connections.map((connection) => (
        <ConnectionCard
          key={connection.connectionId}
          connection={connection}
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
        />
      ))}
    </Box>
  );
};

// Individual connection card
interface ConnectionCardProps {
  connection: PlaidConnection;
  onRefresh: () => void;
  onDisconnect?: (connectionId: string) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onRefresh,
  onDisconnect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExpand = async () => {
    if (!expanded && accounts.length === 0) {
      setLoading(true);
      try {
        const fetchedAccounts = await getConnectionAccounts(connection.connectionId);
        setAccounts(fetchedAccounts);
      } catch (err) {
        setError('Failed to load accounts');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleSync = async () => {
    setMenuAnchor(null);
    setSyncing(true);
    setError(null);
    try {
      await syncConnection(connection.connectionId);
      // Refresh accounts after sync
      const fetchedAccounts = await getConnectionAccounts(connection.connectionId);
      setAccounts(fetchedAccounts);
      onRefresh();
    } catch (err) {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setMenuAnchor(null);
    if (window.confirm(`Are you sure you want to disconnect ${connection.institutionName}? Your account history will be preserved.`)) {
      try {
        await disconnectConnection(connection.connectionId);
        onDisconnect?.(connection.connectionId);
        onRefresh();
      } catch (err) {
        setError('Failed to disconnect. Please try again.');
      }
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Bank Icon */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              bgcolor: 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BankIcon color="primary" />
          </Box>

          {/* Bank Name & Status */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {connection.institutionName || 'Unknown Bank'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConnectionStatusChip status={connection.status} size="small" />
              <Typography variant="caption" color="text.secondary">
                Last synced: {formatSyncTime(connection.lastSyncedAt)}
              </Typography>
            </Box>
          </Box>

          {/* Syncing indicator */}
          {syncing && <CircularProgress size={24} />}

          {/* Expand button */}
          <Tooltip title={expanded ? 'Hide accounts' : 'Show accounts'}>
            <IconButton onClick={handleExpand} disabled={loading}>
              {loading ? (
                <CircularProgress size={20} />
              ) : expanded ? (
                <CollapseIcon />
              ) : (
                <ExpandIcon />
              )}
            </IconButton>
          </Tooltip>

          {/* More menu */}
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={handleSync} disabled={syncing}>
              <ListItemIcon>
                <RefreshIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sync Now</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDisconnect}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Disconnect</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Connection error message */}
        {connection.errorMessage && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {connection.errorMessage}
          </Alert>
        )}
      </CardContent>

      {/* Expandable accounts list */}
      <Collapse in={expanded}>
        <Divider />
        <List dense>
          {accounts.map((account) => (
            <ListItem key={account.cashAccountId}>
              <ListItemText
                primary={account.name}
                secondary={`Last synced: ${formatSyncTime(account.lastSyncedAt)}`}
              />
              <Typography variant="body1" fontWeight="medium">
                ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Typography>
            </ListItem>
          ))}
          {accounts.length === 0 && !loading && (
            <ListItem>
              <ListItemText secondary="No accounts found" />
            </ListItem>
          )}
        </List>
      </Collapse>
    </Card>
  );
};

// Status chip component
interface ConnectionStatusChipProps {
  status: ConnectionStatus;
  size?: 'small' | 'medium';
}

export const ConnectionStatusChip: React.FC<ConnectionStatusChipProps> = ({
  status,
  size = 'small',
}) => {
  const getIcon = () => {
    switch (status) {
      case 'Connected':
        return <CheckIcon fontSize="small" />;
      case 'Syncing':
        return <ScheduleIcon fontSize="small" />;
      case 'SyncFailed':
      case 'Expired':
        return <ErrorIcon fontSize="small" />;
      case 'Disconnected':
        return <WarningIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const statusColor = getStatusColor(status);
  const icon = getIcon();

  return (
    <Chip
      icon={icon}
      label={getStatusLabel(status)}
      size={size}
      color={statusColor}
      variant="outlined"
    />
  );
};

export default ConnectedBanksList;
