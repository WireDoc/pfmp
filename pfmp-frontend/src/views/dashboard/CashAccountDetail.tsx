import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { getAccount, type AccountResponse } from '../../services/accountsApi';
import { AccountSummaryHeader } from '../../components/holdings/AccountSummaryHeader';

// Transaction interfaces
interface Transaction {
  transactionId: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  balanceAfter: number;
  checkNumber?: string;
  memo?: string;
}

interface BalanceHistory {
  date: string;
  balance: number;
}

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
  const { id } = useParams<{ id: string }>();
  const accountId = parseInt(id || '0', 10);

  const [currentTab, setCurrentTab] = useState(0);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [interestSummary, setInterestSummary] = useState<InterestSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  // Fetch account details
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAccount(accountId);
        setAccount(data);
      } catch (err) {
        console.error('Error fetching account:', err);
        setError('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchAccount();
    }
  }, [accountId]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const response = await fetch(`/api/accounts/${accountId}/transactions?limit=100`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setTransactionsLoading(false);
      }
    };

    if (accountId && currentTab === 1) {
      fetchTransactions();
    }
  }, [accountId, currentTab]);

  // Fetch balance history
  useEffect(() => {
    const fetchBalanceHistory = async () => {
      try {
        setBalanceLoading(true);
        const response = await fetch(`/api/accounts/${accountId}/balance-history?days=30`);
        if (!response.ok) throw new Error('Failed to fetch balance history');
        const data = await response.json();
        setBalanceHistory(data);
      } catch (err) {
        console.error('Error fetching balance history:', err);
      } finally {
        setBalanceLoading(false);
      }
    };

    if (accountId && currentTab === 2) {
      fetchBalanceHistory();
    }
  }, [accountId, currentTab]);

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !account) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Account not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Account Header */}
      <AccountSummaryHeader 
        accountId={accountId} 
        holdings={[]} 
        loading={loading} 
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
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Account Details
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Institution
                    </Typography>
                    <Typography variant="body1">
                      {account.institution || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Account Type
                    </Typography>
                    <Typography variant="body1">
                      {account.accountType}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Balance
                    </Typography>
                    <Typography variant="h5" color="primary">
                      ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Quick Stats
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Account Number
                    </Typography>
                    <Typography variant="body1">
                      {account.accountNumber || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {new Date(account.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box px={3}>
            {transactionsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : transactions.length === 0 ? (
              <Alert severity="info">No transactions found for this account</Alert>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Recent Transactions
                </Typography>
                <Paper variant="outlined">
                  <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                    {transactions.map((transaction) => (
                      <Box
                        key={transaction.transactionId}
                        sx={{
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 0 },
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box>
                          <Typography variant="body1">
                            {transaction.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                          </Typography>
                          {transaction.memo && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {transaction.memo}
                            </Typography>
                          )}
                        </Box>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 'bold',
                            color: transaction.amount >= 0 ? 'success.main' : 'error.main'
                          }}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Balance History Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box px={3}>
            {balanceLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : balanceHistory.length === 0 ? (
              <Alert severity="info">No balance history available</Alert>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Balance Trend (Last 30 Days)
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chart component coming soon...
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {balanceHistory.slice(0, 5).map((item, index) => (
                      <Box key={index} sx={{ py: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {new Date(item.date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2">
                          ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
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
