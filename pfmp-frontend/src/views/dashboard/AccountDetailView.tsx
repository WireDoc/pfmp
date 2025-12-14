import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { HoldingsTable } from '../../components/holdings/HoldingsTable';
import { HoldingFormModal } from '../../components/holdings/HoldingFormModal';
import { AccountSummaryHeader } from '../../components/holdings/AccountSummaryHeader';
import { AssetAllocationChart } from '../../components/holdings/AssetAllocationChart';
import { PriceChartCard } from '../../components/holdings/PriceChartCard';
import { PerformanceTab } from '../../components/analytics/PerformanceTab';
import { TaxInsightsTab } from '../../components/analytics/TaxInsightsTab';
import { RiskAnalysisTab } from '../../components/analytics/RiskAnalysisTab';
import { AllocationTab } from '../../components/analytics/AllocationTab';
import { InvestmentTransactionList } from '../../components/investment-accounts/InvestmentTransactionList';
import { SkeletonAccountView } from '../../components/accounts/SkeletonAccountView';
import { AccountSetupWizard } from '../../components/accounts/AccountSetupWizard';
import { getAccount, type AccountResponse } from '../../services/accountsApi';
import type { Holding } from '../../types/holdings';

// Account type categories for conditional rendering
type AccountCategory = 'investment' | 'cash' | 'loan' | 'credit' | 'other';

// Map AccountType enum to categories
function getAccountCategory(accountType: string | undefined): AccountCategory {
  if (!accountType) return 'other';
  
  const investmentTypes = ['brokerage', 'retirementaccount401k', 'retirementaccountira', 
                           'retirementaccountroth', 'tsp', 'hsa', 
                           'cryptocurrencyexchange', 'cryptocurrencywallet'];
  const cashTypes = ['checking', 'savings', 'moneymarket', 'certificateofdeposit'];
  const loanTypes = ['mortgage', 'autoloan', 'studentloan', 'personalloan'];
  const creditTypes = ['creditcard', 'lineofcredit'];
  
  const normalizedType = accountType.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (investmentTypes.includes(normalizedType)) return 'investment';
  if (cashTypes.includes(normalizedType)) return 'cash';
  if (loanTypes.includes(normalizedType)) return 'loan';
  if (creditTypes.includes(normalizedType)) return 'credit';
  
  return 'other';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function AccountDetailView() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';
  
  // Determine account category for conditional rendering
  const accountCategory = getAccountCategory(account?.accountType);
  const isInvestmentAccount = accountCategory === 'investment';
  const isSkeletonAccount = account?.state === 'SKELETON';

  const fetchHoldings = useCallback(async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch account details and holdings in parallel
      const [accountData, holdingsResponse] = await Promise.all([
        getAccount(Number(accountId)),
        fetch(`${apiBase}/holdings?accountId=${accountId}`)
      ]);
      
      setAccount(accountData);
      
      if (!holdingsResponse.ok) {
        throw new Error(`Failed to fetch holdings: ${holdingsResponse.status}`);
      }
      
      const holdingsData = await holdingsResponse.json();
      setHoldings(holdingsData);
      
      // Set first non-$CASH holding as selected by default if available
      if (holdingsData.length > 0 && !selectedHolding) {
        const nonCashHoldings = holdingsData.filter((h: Holding) => h.symbol !== '$CASH');
        setSelectedHolding(nonCashHoldings.length > 0 ? nonCashHoldings[0] : holdingsData[0]);
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [accountId, apiBase, selectedHolding]);

  useEffect(() => {
    if (accountId) {
      fetchHoldings();
    }
  }, [accountId, fetchHoldings]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddHolding = () => {
    setEditingHolding(null);
    setModalOpen(true);
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setModalOpen(true);
  };

  const handleSelectHolding = (holding: Holding) => {
    setSelectedHolding(holding);
  };

  const handleDeleteHolding = async (holdingId: number) => {
    if (!window.confirm('Are you sure you want to delete this holding?')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/holdings/${holdingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete holding');
      }

      // Refresh holdings list
      await fetchHoldings();
    } catch (err) {
      console.error('Error deleting holding:', err);
      alert('Failed to delete holding');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingHolding(null);
  };

  const handleModalSave = async () => {
    await fetchHoldings();
    handleModalClose();
  };

  const handleRefreshPrices = async () => {
    if (!accountId || refreshing) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(`${apiBase}/holdings/refresh-prices?accountId=${accountId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh prices: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Refresh result:', result);
      
      // Refresh the holdings data to show updated prices
      await fetchHoldings();
    } catch (err) {
      console.error('Error refreshing prices:', err);
      alert(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  if (!accountId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid account ID</Alert>
      </Box>
    );
  }

  // Note: Legacy integer-based cash accounts from old Accounts table are displayed here
  // New UUID-based cash accounts should use /dashboard/cash-accounts/:cashAccountId route

  return (
    <Box sx={{ p: 3 }}>
      {/* Secondary Breadcrumbs - Back Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">
          {account?.accountName || 'Account Details'}
        </Typography>
      </Breadcrumbs>

      {/* Account Summary Header */}
      <AccountSummaryHeader 
        accountId={Number(accountId)} 
        holdings={holdings}
        loading={loading}
        onRefreshPrices={handleRefreshPrices}
        refreshing={refreshing}
      />

      {/* SKELETON Account View - No Tabs */}
      {isInvestmentAccount && isSkeletonAccount && account && (
        <SkeletonAccountView
          account={account}
          onBalanceUpdated={(updatedAccount) => {
            setAccount(updatedAccount);
          }}
          onSetupClick={() => setWizardOpen(true)}
        />
      )}

      {/* DETAILED Account View - Tabs */}
      {isInvestmentAccount && !isSkeletonAccount && account && (
        <>
          {/* Action Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Holdings" />
              <Tab label="Performance" />
              <Tab label="Tax Insights" />
              <Tab label="Risk Analysis" />
              <Tab label="Allocation" />
              <Tab label="Transactions" />
            </Tabs>
            
            {tabValue === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddHolding}
              >
                Add Holding
              </Button>
            )}
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box>
              {holdings.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Asset Allocation
                    </Typography>
                    <AssetAllocationChart holdings={holdings} />
                  </Paper>
                </Box>
              )}
              
              {holdings.length > 0 && selectedHolding ? (
                <Box sx={{ mb: 4 }}>
                  <PriceChartCard 
                    holdingId={selectedHolding.holdingId} 
                    symbol={selectedHolding.symbol}
                  />
                </Box>
              ) : holdings.length > 0 ? (
                <Box sx={{ mb: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Price History
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Select an asset from the table below to view its price history.
                    </Typography>
                  </Paper>
                </Box>
              ) : null}
              
              <HoldingsTable
                holdings={holdings}
                selectedHoldingId={selectedHolding?.holdingId}
                onSelect={handleSelectHolding}
                onEdit={handleEditHolding}
                onDelete={handleDeleteHolding}
              />
            </Box>
          )}
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={1}>
          <PerformanceTab accountId={Number(accountId)} />
        </TabPanel>

        {/* Tax Insights Tab */}
        <TabPanel value={tabValue} index={2}>
          <TaxInsightsTab accountId={Number(accountId)} />
        </TabPanel>

        {/* Risk Analysis Tab */}
        <TabPanel value={tabValue} index={3}>
          <RiskAnalysisTab accountId={Number(accountId)} />
        </TabPanel>

        {/* Allocation Tab */}
        <TabPanel value={tabValue} index={4}>
          <AllocationTab accountId={Number(accountId)} />
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={5}>
          <InvestmentTransactionList 
            accountId={Number(accountId)} 
            connectionId={account?.connectionId ?? undefined}
            userId={account?.userId}
          />
        </TabPanel>

        {/* Add/Edit Modal */}
        <HoldingFormModal
          open={modalOpen}
          holding={editingHolding}
          accountId={Number(accountId)}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
        </>
      )}

      {/* Non-Investment Account View */}
      {!isInvestmentAccount && (
        <Paper sx={{ p: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {accountCategory === 'loan' ? 'Loan Account View' : 
               accountCategory === 'credit' ? 'Credit Card View' : 
               'Account View'}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              This account type will have a dedicated detail view in a future update (Wave 9.3+).
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {accountCategory === 'cash' && 
                'This is a legacy cash account. New cash accounts use our enhanced UUID-based system with advanced transaction tracking. Visit the Accounts page to manage your cash accounts.'}
              {accountCategory === 'loan' && 
                'Coming soon: Payment schedule, amortization calculator, principal/interest breakdown, and payoff calculator.'}
              {accountCategory === 'credit' && 
                'Coming soon: Transaction history, spending breakdown by category, payment tracking, and credit utilization.'}
              {accountCategory === 'other' && 
                'Transaction history and account-specific features coming soon.'}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Account Setup Wizard */}
      {isInvestmentAccount && isSkeletonAccount && (
        <AccountSetupWizard
          open={wizardOpen}
          account={account}
          onClose={() => setWizardOpen(false)}
          onComplete={async (updatedAccount) => {
            setAccount(updatedAccount);
            setWizardOpen(false);
            // Refresh holdings after transition and get fresh data
            try {
              const holdingsResponse = await fetch(`${apiBase}/holdings?accountId=${accountId}`);
              if (holdingsResponse.ok) {
                const freshHoldings = await holdingsResponse.json();
                setHoldings(freshHoldings);
                // Select first non-$CASH holding to avoid 404 on price lookup
                const nonCashHoldings = freshHoldings.filter((h: Holding) => h.symbol !== '$CASH');
                if (nonCashHoldings.length > 0) {
                  setSelectedHolding(nonCashHoldings[0]);
                } else {
                  setSelectedHolding(null);
                }
              }
            } catch (err) {
              console.error('Error refreshing holdings after wizard:', err);
            }
          }}
        />
      )}
    </Box>
  );
}
