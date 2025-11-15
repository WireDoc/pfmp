import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { getAccount, type AccountResponse } from '../../services/accountsApi';
import { CashAccountSummaryHeader } from '../../components/cash-accounts/CashAccountSummaryHeader';
import { TransactionList } from '../../components/cash-accounts/TransactionList';
import { BalanceTrendChart } from '../../components/cash-accounts/BalanceTrendChart';
import { AccountDetailsCard } from '../../components/cash-accounts/AccountDetailsCard';
import { exportTransactionsToCSV, type Transaction as ExportTransaction } from '../../utils/exportHelpers';

// Transaction interfaces (for Interest Summary only)
interface MonthlyInterest {
  month: number;
  amount: number;
}

interface InterestSummary {
  year: number;
  totalInterestEarned: number;
  monthlyBreakdown: MonthlyInterest[];
}

// Tab panel component
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
      id={`cash-account-tabpanel-${index}`}
      aria-labelledby={`cash-account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CashAccountDetail: React.FC = () => {
  const { cashAccountId } = useParams<{ cashAccountId: string }>();

  const [currentTab, setCurrentTab] = useState(0);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [interestSummary, setInterestSummary] = useState<InterestSummary | null>(null);
  
  const [interestLoading, setInterestLoading] = useState(false);

  // Fetch account details for local use (tabs need this data)
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const data = await getAccount(accountId);
        setAccount(data);
      } catch (err) {
        console.error('Error fetching account:', err);
      }
    };

    if (accountId) {
      fetchAccount();
    }
  }, [accountId]);

  // Fetch interest summary
  useEffect(() => {
    const fetchInterestSummary = async () => {
      try {
        setInterestLoading(true);
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/accounts/${accountId}/interest-summary?year=${currentYear}`);
        if (!response.ok) throw new Error('Failed to fetch interest summary');
        const data = await response.json();
        setInterestSummary(data);
      } catch (err) {
        console.error('Error fetching interest summary:', err);
      } finally {
        setInterestLoading(false);
      }
    };

    if (accountId && currentTab === 3) {
      fetchInterestSummary();
    }
  }, [accountId, currentTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      {/* Account Header */}
      <CashAccountSummaryHeader 
        accountId={accountId} 
        loading={false} 
      />

      {/* Tabs */}
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="cash account tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Transactions" />
          <Tab label="Balance History" />
          <Tab label="Interest" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box px={3}>
            {!account ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Account Details Card */}
                <Grid size={12}>
                  <AccountDetailsCard
                    account={{
                      accountId: account.accountId,
                      accountName: account.accountName,
                      institution: account.institution,
                      accountType: account.accountType,
                      accountNumber: account.accountNumber,
                      routingNumber: undefined, // Not in current AccountResponse
                      currentBalance: account.currentBalance,
                      interestRate: account.interestRate,
                      openingDate: undefined, // Not in current AccountResponse
                      lastSyncDate: account.updatedAt,
                      status: 'Active', // Default status
                      notes: undefined // Not in current AccountResponse
                    }}
                    onExport={() => {
                      // Trigger export by switching to transactions tab
                      // Or could fetch transactions here
                      console.log('Export transactions for account:', accountId);
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box px={3}>
            <TransactionList
              accountId={accountId}
              accountName={account?.accountName}
              onExport={(transactions) => {
                exportTransactionsToCSV(
                  transactions as ExportTransaction[],
                  account?.accountName || 'Account',
                  null,
                  null
                );
              }}
            />
          </Box>
        </TabPanel>

        {/* Balance History Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box px={3}>
            <BalanceTrendChart accountId={accountId} />
          </Box>
        </TabPanel>

        {/* Interest Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box px={3}>
            {interestLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : !interestSummary ? (
              <Alert severity="info">No interest data available</Alert>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Interest Earned - {interestSummary.year}
                </Typography>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Interest Earned
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    ${interestSummary.totalInterestEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                {interestSummary.monthlyBreakdown.length > 0 && (
                  <Paper variant="outlined">
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Monthly Breakdown
                      </Typography>
                      {interestSummary.monthlyBreakdown.map((monthData) => (
                        <Box
                          key={monthData.month}
                          sx={{
                            py: 1.5,
                            borderBottom: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            '&:last-child': { borderBottom: 0 }
                          }}
                        >
                          <Typography variant="body1">
                            {new Date(interestSummary.year, monthData.month - 1).toLocaleDateString('en-US', { month: 'long' })}
                          </Typography>
                          <Typography variant="body1" color="success.main">
                            ${monthData.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default CashAccountDetail;
