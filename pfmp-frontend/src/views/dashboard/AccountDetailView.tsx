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
import { getAccount, type AccountResponse } from '../../services/accountsApi';
import type { Holding } from '../../types/holdings';
import CashAccountDetail from './CashAccountDetail';

// Account type categories for conditional rendering
type AccountCategory = 'investment' | 'cash' | 'loan' | 'credit' | 'other';

// Map AccountType enum to categories
function getAccountCategory(accountType: string | undefined): AccountCategory {
  if (!accountType) return 'other';
  
  const investmentTypes = ['taxablebrokerage', 'traditionaliraid', 'rothira', 'ira401k', 
                           'hsa', 'cryptocurrency', 'education529'];
  const cashTypes = ['checking', 'savings', 'moneymarket', 'cd'];
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
  
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api';
  
  // Determine account category for conditional rendering
  const accountCategory = getAccountCategory(account?.accountType);
  const isInvestmentAccount = accountCategory === 'investment';

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
      
      // Set first holding as selected by default if available
      if (holdingsData.length > 0 && !selectedHolding) {
        setSelectedHolding(holdingsData[0]);
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

  // If this is a cash account, use the dedicated CashAccountDetail component
  if (accountCategory === 'cash') {
    return <CashAccountDetail />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
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
        <Typography color="text.primary">Account Details</Typography>
      </Breadcrumbs>

      {/* Account Summary Header */}
      <AccountSummaryHeader 
        accountId={Number(accountId)} 
        holdings={holdings}
        loading={loading}
        onRefreshPrices={handleRefreshPrices}
        refreshing={refreshing}
      />

      {/* Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          {isInvestmentAccount && <Tab label="Holdings" />}
          <Tab label="Transactions" />
        </Tabs>
        
        {tabValue === 0 && isInvestmentAccount && (
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
      {isInvestmentAccount && (
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box>
              {holdings.length > 0 && selectedHolding && (
                <>
                  <Box sx={{ mb: 4 }}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Asset Allocation
                      </Typography>
                      <AssetAllocationChart holdings={holdings} />
                    </Paper>
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <PriceChartCard 
                      holdingId={selectedHolding.holdingId} 
                      symbol={selectedHolding.symbol}
                    />
                  </Box>
                </>
              )}
              
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
      )}

      <TabPanel value={tabValue} index={isInvestmentAccount ? 1 : 0}>
        <Paper sx={{ p: 3 }}>
          {isInvestmentAccount ? (
            <Typography variant="body1" color="text.secondary">
              Transaction history coming soon...
            </Typography>
          ) : (
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
                {accountCategory === 'loan' && 
                  'Coming soon: Payment schedule, amortization calculator, principal/interest breakdown, and payoff calculator.'}
                {accountCategory === 'credit' && 
                  'Coming soon: Transaction history, spending breakdown by category, payment tracking, and credit utilization.'}
                {accountCategory === 'other' && 
                  'Transaction history and account-specific features coming soon.'}
              </Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Add/Edit Modal */}
      {isInvestmentAccount && (
        <HoldingFormModal
          open={modalOpen}
          holding={editingHolding}
          accountId={Number(accountId)}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </Box>
  );
}
