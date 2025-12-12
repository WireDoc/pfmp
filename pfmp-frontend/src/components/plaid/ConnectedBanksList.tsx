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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
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
  LinkOff as DisconnectIcon,
  Link as ReconnectIcon,
} from '@mui/icons-material';
import { usePlaidLink } from 'react-plaid-link';
import {
  getConnectionAccounts,
  syncConnection,
  disconnectConnection,
  createReconnectLinkToken,
  reconnectSuccess,
  deleteConnectionPermanently,
  getStatusLabel,
  getStatusColor,
  formatSyncTime,
} from '../../services/plaidApi';
import type { PlaidConnection, PlaidAccount, ConnectionStatus } from '../../services/plaidApi';

interface ConnectedBanksListProps {
  connections: PlaidConnection[];
  userId: number;
  onRefresh: () => void;
  onDisconnect?: (connectionId: string) => void;
}

export const ConnectedBanksList: React.FC<ConnectedBanksListProps> = ({
  connections,
  userId,
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
          userId={userId}
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
  userId: number;
  onRefresh: () => void;
  onDisconnect?: (connectionId: string) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  userId,
  onRefresh,
  onDisconnect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAccountsOption, setDeleteAccountsOption] = useState<'keep' | 'delete'>('keep');
  const [deleting, setDeleting] = useState(false);
  const [reconnectLinkToken, setReconnectLinkToken] = useState<string | null>(null);

  const isDisconnected = connection.status === 'Disconnected' || connection.status === 'Expired';

  // Plaid Link for reconnection
  const { open: openReconnectLink, ready: reconnectReady } = usePlaidLink({
    token: reconnectLinkToken || '',
    onSuccess: async () => {
      try {
        await reconnectSuccess(connection.connectionId, userId);
        setReconnectLinkToken(null);
        onRefresh();
      } catch (err) {
        setError('Failed to complete reconnection');
      } finally {
        setReconnecting(false);
      }
    },
    onExit: () => {
      setReconnectLinkToken(null);
      setReconnecting(false);
    },
  });

  // Open reconnect Link when token is ready
  React.useEffect(() => {
    if (reconnectLinkToken && reconnectReady) {
      openReconnectLink();
    }
  }, [reconnectLinkToken, reconnectReady, openReconnectLink]);

  const handleExpand = async () => {
    if (!expanded && accounts.length === 0) {
      setLoading(true);
      try {
        const fetchedAccounts = await getConnectionAccounts(connection.connectionId, userId);
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
      await syncConnection(connection.connectionId, userId);
      // Refresh accounts after sync
      const fetchedAccounts = await getConnectionAccounts(connection.connectionId, userId);
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
    if (window.confirm(`Are you sure you want to pause syncing for ${connection.institutionName || 'this bank'}? You can reconnect later.`)) {
      try {
        await disconnectConnection(connection.connectionId, userId);
        onRefresh();
      } catch (err) {
        setError('Failed to disconnect. Please try again.');
      }
    }
  };

  const handleReconnect = async () => {
    setMenuAnchor(null);
    setReconnecting(true);
    setError(null);
    try {
      const token = await createReconnectLinkToken(connection.connectionId, userId);
      setReconnectLinkToken(token);
    } catch (err) {
      setError('Unable to reconnect. The connection may have been permanently deleted. Try linking the bank again.');
      setReconnecting(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setMenuAnchor(null);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteAccountsOption('keep');
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteConnectionPermanently(connection.connectionId, userId, deleteAccountsOption === 'delete');
      setDeleteDialogOpen(false);
      onDisconnect?.(connection.connectionId);
      onRefresh();
    } catch (err) {
      setError('Failed to delete connection. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Bank Connection</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          This will permanently remove the connection to <strong>{connection.institutionName || 'this bank'}</strong>.
          What would you like to do with the linked accounts?
        </DialogContentText>
        
        <RadioGroup
          value={deleteAccountsOption}
          onChange={(e) => setDeleteAccountsOption(e.target.value as 'keep' | 'delete')}
        >
          <FormControlLabel 
            value="keep" 
            control={<Radio />} 
            label={
              <Box>
                <Typography fontWeight="medium">Keep accounts as manual entries</Typography>
                <Typography variant="body2" color="text.secondary">
                  The accounts will be converted to manual accounts. Balances will no longer sync automatically.
                </Typography>
              </Box>
            }
          />
          <FormControlLabel 
            value="delete" 
            control={<Radio />} 
            label={
              <Box>
                <Typography fontWeight="medium" color="error.main">Delete accounts completely</Typography>
                <Typography variant="body2" color="text.secondary">
                  All linked accounts and their data will be permanently deleted.
                </Typography>
              </Box>
            }
          />
        </RadioGroup>

        {deleteAccountsOption === 'keep' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Note:</strong> If you link this bank again in the future, the accounts may be duplicated.
            You would need to manually delete the old unlinked accounts.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDeleteDialog} disabled={deleting}>Cancel</Button>
        <Button 
          onClick={handleConfirmDelete} 
          color="error" 
          variant="contained"
          disabled={deleting}
        >
          {deleting ? <CircularProgress size={20} /> : 'Delete Connection'}
        </Button>
      </DialogActions>
    </Dialog>
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
            {!isDisconnected ? (
              // Connected status menu items
              [
                <MenuItem key="sync" onClick={handleSync} disabled={syncing}>
                  <ListItemIcon>
                    <RefreshIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Sync Now</ListItemText>
                </MenuItem>,
                <MenuItem key="disconnect" onClick={handleDisconnect}>
                  <ListItemIcon>
                    <DisconnectIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText sx={{ color: 'warning.main' }}>Pause Syncing</ListItemText>
                </MenuItem>
              ]
            ) : (
              // Disconnected status menu items
              [
                <MenuItem key="reconnect" onClick={handleReconnect} disabled={reconnecting}>
                  <ListItemIcon>
                    <ReconnectIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText>Reconnect</ListItemText>
                  {reconnecting && <CircularProgress size={16} sx={{ ml: 1 }} />}
                </MenuItem>,
                <MenuItem key="delete" onClick={handleOpenDeleteDialog}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
                </MenuItem>
              ]
            )}
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
    </>
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
