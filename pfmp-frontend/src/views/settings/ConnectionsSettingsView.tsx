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
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountBalance as BankIcon,
  TrendingUp as InvestmentsIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  CreditCard as CreditCardIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { PlaidUnifiedLinkButton, ConnectedBanksList } from '../../components/plaid';
import { 
  getConnections, 
  syncAllConnections,
  getUnifiedConnections,
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

// Credit Cards List Component (Wave 12.5)
interface CreditCardsListProps {
  connections: UnifiedConnectionInfo[];
  userId: number;
  onRefresh: () => void;
}

const CreditCardsList: React.FC<CreditCardsListProps> = ({ connections }) => {
  return (
    <Stack spacing={2}>
      {connections.map((conn) => (
        <Paper key={conn.connectionId} variant="outlined" sx={{ p: 2 }}>
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

const MortgagesList: React.FC<MortgagesListProps> = ({ connections }) => {
  return (
    <Stack spacing={2}>
      {connections.map((conn) => (
        <Paper key={conn.connectionId} variant="outlined" sx={{ p: 2 }}>
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

  // Separate connections by type
  const bankConnections = connections.filter(c => c.source !== 'PlaidInvestments');
  const investmentConnections = connections.filter(c => c.source === 'PlaidInvestments');
  
  // Calculate unified stats
  const totalCreditCards = unifiedConnections.reduce((sum, c) => sum + (c.creditCardCount || 0), 0);
  const totalMortgages = unifiedConnections.reduce((sum, c) => sum + (c.mortgageCount || 0), 0);

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
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3, pb: 3 }}>
                {bankConnections.length > 0 ? (
                  <ConnectedBanksList
                    connections={bankConnections}
                    userId={userId}
                    onRefresh={loadConnections}
                    onDisconnect={handleDisconnect}
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <BankIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>No bank accounts connected</Typography>
                    <PlaidUnifiedLinkButton
                      userId={userId}
                      onSuccess={handleLinkSuccess}
                      buttonText="Link Bank Account"
                      size="small"
                      defaultProducts={['transactions']}
                      skipProductSelection
                    />
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
                  />
                ) : (
                  <Box textAlign="center" py={4}>
                    <InvestmentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>No investment accounts connected</Typography>
                    <PlaidUnifiedLinkButton
                      userId={userId}
                      onSuccess={handleLinkSuccess}
                      buttonText="Link Investment Account"
                      variant="outlined"
                      color="success"
                      size="small"
                      defaultProducts={['investments']}
                      skipProductSelection
                    />
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
                    <Typography color="text.secondary" sx={{ mb: 2 }}>No credit cards connected</Typography>
                    <PlaidUnifiedLinkButton
                      userId={userId}
                      onSuccess={handleLinkSuccess}
                      buttonText="Link Credit Card"
                      variant="outlined"
                      color="warning"
                      size="small"
                      defaultProducts={['liabilities']}
                      skipProductSelection
                    />
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
                    <Typography color="text.secondary" sx={{ mb: 2 }}>No mortgages connected</Typography>
                    <PlaidUnifiedLinkButton
                      userId={userId}
                      onSuccess={handleLinkSuccess}
                      buttonText="Link Mortgage"
                      variant="outlined"
                      color="info"
                      size="small"
                      defaultProducts={['liabilities']}
                      skipProductSelection
                    />
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
              Link your bank accounts, investments, credit cards, and mortgages to automatically 
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
