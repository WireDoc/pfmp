/**
 * ConnectionsSettingsView (Wave 11 → Unified in Wave 12.5)
 * 
 * Unified settings page for managing ALL connected accounts.
 * Route: /settings/connections
 * 
 * Wave 12.5: Added unified linking, credit cards, and mortgages tabs.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Skeleton,
  Alert,
  Tabs,
  Tab,
  Chip,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountBalance as BankIcon,
  TrendingUp as InvestmentsIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  CreditCard as CreditCardIcon,
  Home as HomeIcon,
  School as StudentLoanIcon,
  MoreVert as MoreIcon,
  LinkOff as DisconnectIcon,
  Delete as DeleteIcon,
  Link as ReconnectIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { PlaidUnifiedLinkButton, ConnectedBanksList } from '../../components/plaid';
import { usePlaidLink } from 'react-plaid-link';
import { 
  getConnections, 
  syncAllConnections,
  getUnifiedConnections,
  syncConnection,
  disconnectConnection,
  createReconnectLinkToken,
  reconnectSuccess,
  deleteConnectionPermanently,
  type UnifiedConnectionInfo,
} from '../../services/plaidApi';
import type { PlaidConnection } from '../../services/plaidApi';
import { useDevUserId } from '../../dev/devUserState';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Connection Action Menu - shared by CreditCards, Mortgages, Student Loans lists
// Mirrors the ConnectedBanksList menu: connected → Sync Now + Pause Syncing; disconnected → Reconnect + Delete
interface ConnectionActionMenuProps {
  connectionId: string;
  institutionName: string;
  userId: number;
  status: string;
  errorMessage?: string;
  onRefresh: () => void;
}

const ConnectionActionMenu: React.FC<ConnectionActionMenuProps> = ({ connectionId, institutionName, userId, status, errorMessage, onRefresh }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAccountsOption, setDeleteAccountsOption] = useState<'keep' | 'delete'>('keep');
  const [deleting, setDeleting] = useState(false);
  const [reconnectLinkToken, setReconnectLinkToken] = useState<string | null>(null);

  const isDisconnected = status === 'Disconnected' || status === 'Expired'
    || (status === 'SyncFailed' && errorMessage?.toLowerCase().includes('login'));

  // Plaid Link for reconnection
  const { open: openReconnectLink, ready: reconnectReady } = usePlaidLink({
    token: reconnectLinkToken || '',
    onSuccess: async () => {
      try {
        await reconnectSuccess(connectionId, userId);
        setReconnectLinkToken(null);
        onRefresh();
      } catch {
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

  React.useEffect(() => {
    if (reconnectLinkToken && reconnectReady) {
      openReconnectLink();
    }
  }, [reconnectLinkToken, reconnectReady, openReconnectLink]);

  const handleSync = async () => {
    setAnchorEl(null);
    setSyncing(true);
    setError(null);
    try {
      await syncConnection(connectionId, userId);
      onRefresh();
    } catch {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setAnchorEl(null);
    if (window.confirm(`Are you sure you want to pause syncing for ${institutionName}? You can reconnect later.`)) {
      try {
        await disconnectConnection(connectionId, userId);
        onRefresh();
      } catch {
        setError('Failed to disconnect. Please try again.');
      }
    }
  };

  const handleReconnect = async () => {
    setAnchorEl(null);
    setReconnecting(true);
    setError(null);
    try {
      const token = await createReconnectLinkToken(connectionId, userId);
      setReconnectLinkToken(token);
    } catch {
      setError('Unable to reconnect. The connection may have been permanently deleted. Try linking the account again.');
      setReconnecting(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setAnchorEl(null);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteAccountsOption('keep');
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteConnectionPermanently(connectionId, userId, deleteAccountsOption === 'delete');
      setDeleteDialogOpen(false);
      onRefresh();
    } catch {
      setError('Failed to delete connection. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: -40, right: 0, zIndex: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {syncing && <CircularProgress size={20} />}
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Connection actions">
        <MoreIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {!isDisconnected ? (
          [
            <MenuItem key="sync" onClick={handleSync} disabled={syncing}>
              <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sync Now</ListItemText>
            </MenuItem>,
            <MenuItem key="disconnect" onClick={handleDisconnect}>
              <ListItemIcon><DisconnectIcon fontSize="small" color="warning" /></ListItemIcon>
              <ListItemText sx={{ color: 'warning.main' }}>Pause Syncing</ListItemText>
            </MenuItem>
          ]
        ) : (
          [
            <MenuItem key="reconnect" onClick={handleReconnect} disabled={reconnecting}>
              <ListItemIcon><ReconnectIcon fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText>Reconnect</ListItemText>
              {reconnecting && <CircularProgress size={16} sx={{ ml: 1 }} />}
            </MenuItem>,
            <MenuItem key="delete" onClick={handleOpenDeleteDialog}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
            </MenuItem>
          ]
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Connection</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently remove the connection to <strong>{institutionName}</strong>.
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
              <strong>Note:</strong> If you link this account again in the future, the accounts may be duplicated.
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
    </>
  );
};

// Credit Cards List Component (Wave 12.5)
interface CreditCardsListProps {
  connections: UnifiedConnectionInfo[];
  userId: number;
  onRefresh: () => void;
}

const CreditCardsList: React.FC<CreditCardsListProps> = ({ connections, userId, onRefresh }) => {
  return (
    <Stack spacing={2}>
      {connections.map((conn) => (
        <Paper key={conn.connectionId} variant="outlined" sx={{ p: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CreditCardIcon color="warning" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {conn.institutionName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {conn.creditCardCount} credit card{conn.creditCardCount !== 1 ? 's' : ''} linked
              </Typography>
            </Box>
            <Chip 
              label={conn.status} 
              size="small" 
              color={conn.status === 'Connected' ? 'success' : 'default'}
            />
            <ConnectionActionMenu
              connectionId={conn.connectionId}
              institutionName={conn.institutionName}
              userId={userId}
              status={conn.status}
              errorMessage={conn.errorMessage}
              onRefresh={onRefresh}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

// Mortgages List Component (Wave 12.5)
interface MortgagesListProps {
  connections: UnifiedConnectionInfo[];
  userId: number;
  onRefresh: () => void;
}

const MortgagesList: React.FC<MortgagesListProps> = ({ connections, userId, onRefresh }) => {
  return (
    <Stack spacing={2}>
      {connections.map((conn) => (
        <Paper key={conn.connectionId} variant="outlined" sx={{ p: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HomeIcon color="info" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {conn.institutionName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {conn.mortgageCount} mortgage{conn.mortgageCount !== 1 ? 's' : ''} linked
              </Typography>
            </Box>
            <Chip 
              label={conn.status} 
              size="small" 
              color={conn.status === 'Connected' ? 'success' : 'default'}
            />
            <ConnectionActionMenu
              connectionId={conn.connectionId}
              institutionName={conn.institutionName}
              userId={userId}
              status={conn.status}
              errorMessage={conn.errorMessage}
              onRefresh={onRefresh}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};


// Student Loans List Component (Wave 12.5)
interface StudentLoansListProps {
  connections: UnifiedConnectionInfo[];
  userId: number;
  onRefresh: () => void;
}

const StudentLoansList: React.FC<StudentLoansListProps> = ({ connections, userId, onRefresh }) => {
  return (
    <Stack spacing={2}>
      {connections.map((conn) => (
        <Paper key={conn.connectionId} variant="outlined" sx={{ p: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StudentLoanIcon color="secondary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {conn.institutionName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {conn.studentLoanCount} student loan{conn.studentLoanCount !== 1 ? 's' : ''} linked
              </Typography>
            </Box>
            <Chip 
              label={conn.status} 
              size="small" 
              color={conn.status === 'Connected' ? 'success' : 'default'}
            />
            <ConnectionActionMenu
              connectionId={conn.connectionId}
              institutionName={conn.institutionName}
              userId={userId}
              status={conn.status}
              errorMessage={conn.errorMessage}
              onRefresh={onRefresh}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

export const ConnectionsSettingsView: React.FC = () => {
  const devUserId = useDevUserId();
  const userId = devUserId ?? Number(import.meta.env.VITE_PFMP_DASHBOARD_USER_ID || '1');
  
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [unifiedConnections, setUnifiedConnections] = useState<UnifiedConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Enrich legacy connections with unified product data for proper tab categorization
  const enrichedConnections = connections.map(c => {
    const unified = unifiedConnections.find(u => u.connectionId === c.connectionId);
    return { 
      ...c, 
      products: unified?.products ?? c.products, 
      isUnified: unified?.isUnified ?? c.isUnified ?? false,
    };
  });

  // Separate connections by product type (not source enum)
  const bankConnections = enrichedConnections.filter(c =>
    c.isUnified ? (c.products?.includes('transactions') ?? false) : c.source !== 'PlaidInvestments'
  );
  const investmentConnections = enrichedConnections.filter(c =>
    c.isUnified ? (c.products?.includes('investments') ?? false) : c.source === 'PlaidInvestments'
  );
  
  // Calculate unified stats from the unified endpoint (which now returns actual counts)
  const totalCreditCards = unifiedConnections.reduce((sum, c) => sum + (c.creditCardCount || 0), 0);
  const totalMortgages = unifiedConnections.reduce((sum, c) => sum + (c.mortgageCount || 0), 0);
  const totalStudentLoans = unifiedConnections.reduce((sum, c) => sum + (c.studentLoanCount || 0), 0);

  const loadConnections = useCallback(async () => {
    try {
      setError(null);
      const [legacyData, unifiedData] = await Promise.all([
        getConnections(userId),
        getUnifiedConnections(userId).catch(() => [] as UnifiedConnectionInfo[]), // Graceful fallback
      ]);
      setConnections(legacyData);
      setUnifiedConnections(unifiedData);
    } catch (err) {
      setError('Failed to load connected accounts. Please try again.');
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAllConnections(userId);
      await loadConnections();
      setSuccessMessage('All accounts synced successfully!');
    } catch (err) {
      setError('Failed to sync accounts. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkSuccess = () => {
    loadConnections();
    setSuccessMessage('Account linked successfully!');
  };

  const handleDisconnect = (connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const hasConnections = connections.length > 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          color="inherit"
        >
          Dashboard
        </Link>
        <Link
          component={RouterLink}
          to="/dashboard/settings"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <SettingsIcon fontSize="small" />
          Settings
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LinkIcon fontSize="small" />
          Connected Accounts
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Connected Accounts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your linked bank and investment accounts
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {hasConnections && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleSyncAll}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
          )}
          <PlaidUnifiedLinkButton
            userId={userId}
            onSuccess={handleLinkSuccess}
            buttonText="Link Account"
            variant="contained"
            size="medium"
          />
        </Stack>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Summary Stats */}
      {!loading && hasConnections && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
          <Chip 
            icon={<BankIcon />} 
            label={`${bankConnections.length} Bank${bankConnections.length !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            icon={<InvestmentsIcon />} 
            label={`${investmentConnections.length} Investment${investmentConnections.length !== 1 ? 's' : ''}`}
            color="success"
            variant="outlined"
          />
          {totalCreditCards > 0 && (
            <Chip 
              icon={<CreditCardIcon />} 
              label={`${totalCreditCards} Credit Card${totalCreditCards !== 1 ? 's' : ''}`}
              color="warning"
              variant="outlined"
            />
          )}
          {totalMortgages > 0 && (
            <Chip 
              icon={<HomeIcon />} 
              label={`${totalMortgages} Mortgage${totalMortgages !== 1 ? 's' : ''}`}
              color="info"
              variant="outlined"
            />
          )}
          {totalStudentLoans > 0 && (
            <Chip 
              icon={<StudentLoanIcon />} 
              label={`${totalStudentLoans} Student Loan${totalStudentLoans !== 1 ? 's' : ''}`}
              color="secondary"
              variant="outlined"
            />
          )}
        </Stack>
      )}

      {/* Main Content */}
      <Paper sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="rounded" height={80} sx={{ mt: 2 }} />
            <Skeleton variant="rounded" height={80} sx={{ mt: 2 }} />
          </Box>
        ) : hasConnections ? (
          <>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                icon={<BankIcon />} 
                iconPosition="start" 
                label={`Banks (${bankConnections.length})`}
              />
              <Tab 
                icon={<InvestmentsIcon />} 
                iconPosition="start" 
                label={`Investments (${investmentConnections.length})`}
              />
              <Tab 
                icon={<CreditCardIcon />} 
                iconPosition="start" 
                label={`Credit Cards (${totalCreditCards})`}
              />
              <Tab 
                icon={<HomeIcon />} 
                iconPosition="start" 
                label={`Mortgages (${totalMortgages})`}
              />
              <Tab 
                icon={<StudentLoanIcon />} 
                iconPosition="start" 
                label={`Student Loans (${totalStudentLoans})`}
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3, pb: 3 }}>
                {bankConnections.length > 0 ? (
                  <ConnectedBanksList
                    connections={bankConnections}
                    userId={userId}
                    onRefresh={loadConnections}
                    onDisconnect={handleDisconnect}
                    productType="transactions"
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <BankIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No bank accounts connected</Typography>
                    <Typography variant="body2" color="text.secondary">Use the "Link Account" button above to connect a bank.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3, pb: 3 }}>
                {investmentConnections.length > 0 ? (
                  <ConnectedBanksList
                    connections={investmentConnections}
                    userId={userId}
                    onRefresh={loadConnections}
                    onDisconnect={handleDisconnect}
                    productType="investments"
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <InvestmentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No investment accounts connected</Typography>
                    <Typography variant="body2" color="text.secondary">Use the "Link Account" button above to connect an investment account.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 3, pb: 3 }}>
                {totalCreditCards > 0 ? (
                  <CreditCardsList 
                    connections={unifiedConnections.filter(c => c.creditCardCount > 0)}
                    userId={userId}
                    onRefresh={loadConnections}
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <CreditCardIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No credit cards connected</Typography>
                    <Typography variant="body2" color="text.secondary">Use the "Link Account" button above to connect credit cards.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Box sx={{ px: 3, pb: 3 }}>
                {totalMortgages > 0 ? (
                  <MortgagesList 
                    connections={unifiedConnections.filter(c => c.mortgageCount > 0)}
                    userId={userId}
                    onRefresh={loadConnections}
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <HomeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No mortgages connected</Typography>
                    <Typography variant="body2" color="text.secondary">Use the "Link Account" button above to connect a mortgage.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Box sx={{ px: 3, pb: 3 }}>
                {totalStudentLoans > 0 ? (
                  <StudentLoansList 
                    connections={unifiedConnections.filter(c => c.studentLoanCount > 0)}
                    userId={userId}
                    onRefresh={loadConnections}
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <StudentLoanIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No student loans connected</Typography>
                    <Typography variant="body2" color="text.secondary">Use the "Link Account" button above to connect student loans.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>
          </>
        ) : (
          // Empty State
          <Box textAlign="center" py={6} px={3}>
            <LinkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Accounts Connected
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Link your bank accounts, investments, credit cards, mortgages, and student loans to automatically 
              sync balances, track holdings, and monitor your complete financial picture.
            </Typography>
            <PlaidUnifiedLinkButton
              userId={userId}
              onSuccess={handleLinkSuccess}
              buttonText="Link Account"
              variant="contained"
            />
          </Box>
        )}
      </Paper>

      {/* Security Note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>🔒 Security Note:</strong> We use Plaid, a trusted financial services provider, 
          to securely connect to your accounts. We never store your login credentials, and 
          you can disconnect your accounts at any time.
        </Typography>
      </Box>

      {/* Sync Schedule Info */}
      {hasConnections && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>⏰ Automatic Sync:</strong> Your account balances are automatically 
            updated daily. Investment prices are refreshed from live market data.
            You can also manually sync at any time using the "Sync All" button.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default ConnectionsSettingsView;
