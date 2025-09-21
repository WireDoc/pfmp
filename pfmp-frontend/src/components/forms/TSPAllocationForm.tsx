import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Account, TSPAllocation, accountService } from '../../services/api';

interface TSPAllocationFormProps {
  userId: number;
  onUpdate?: () => void;
}

const TSP_FUNDS = [
  // Individual Funds
  { key: 'gFundPercentage', label: 'G Fund (Government Securities)', description: 'Lowest risk, guaranteed return', category: 'individual' },
  { key: 'fFundPercentage', label: 'F Fund (Fixed Income)', description: 'Bond index fund', category: 'individual' },
  { key: 'cFundPercentage', label: 'C Fund (Common Stock)', description: 'S&P 500 index fund', category: 'individual' },
  { key: 'sFundPercentage', label: 'S Fund (Small Cap Stock)', description: 'Small/mid-cap stocks', category: 'individual' },
  { key: 'iFundPercentage', label: 'I Fund (International Stock)', description: 'International developed markets', category: 'individual' },
  
  // Lifecycle Funds
  { key: 'lIncomeFundPercentage', label: 'L Income Fund', description: 'For current retirees and those in withdrawal phase', category: 'lifecycle' },
  { key: 'l2030FundPercentage', label: 'L 2030 Fund', description: 'Target retirement 2030', category: 'lifecycle' },
  { key: 'l2035FundPercentage', label: 'L 2035 Fund', description: 'Target retirement 2035', category: 'lifecycle' },
  { key: 'l2040FundPercentage', label: 'L 2040 Fund', description: 'Target retirement 2040', category: 'lifecycle' },
  { key: 'l2045FundPercentage', label: 'L 2045 Fund', description: 'Target retirement 2045', category: 'lifecycle' },
  { key: 'l2050FundPercentage', label: 'L 2050 Fund', description: 'Target retirement 2050', category: 'lifecycle' },
  { key: 'l2055FundPercentage', label: 'L 2055 Fund', description: 'Target retirement 2055', category: 'lifecycle' },
  { key: 'l2060FundPercentage', label: 'L 2060 Fund', description: 'Target retirement 2060', category: 'lifecycle' },
  { key: 'l2065FundPercentage', label: 'L 2065 Fund', description: 'Target retirement 2065', category: 'lifecycle' },
  { key: 'l2070FundPercentage', label: 'L 2070 Fund', description: 'Target retirement 2070', category: 'lifecycle' },
  { key: 'l2075FundPercentage', label: 'L 2075 Fund', description: 'Target retirement 2075', category: 'lifecycle' },
];

export const TSPAllocationForm: React.FC<TSPAllocationFormProps> = ({ userId, onUpdate }) => {
  const [tspAccounts, setTspAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [allocation, setAllocation] = useState<TSPAllocation>({
    // Individual Funds
    gFundPercentage: 0,
    fFundPercentage: 0,
    cFundPercentage: 0,
    sFundPercentage: 0,
    iFundPercentage: 0,
    
    // Lifecycle Funds
    lIncomeFundPercentage: 0,
    l2030FundPercentage: 0,
    l2035FundPercentage: 0,
    l2040FundPercentage: 0,
    l2045FundPercentage: 0,
    l2050FundPercentage: 0,
    l2055FundPercentage: 0,
    l2060FundPercentage: 0,
    l2065FundPercentage: 0,
    l2070FundPercentage: 0,
    l2075FundPercentage: 0,
    
    lastUpdated: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTspAccounts();
  }, [userId]);

  const loadTspAccounts = async () => {
    try {
      const response = await accountService.getByUser(userId);
      const tspAccounts = response.data.filter(account => account.accountType === 'TSP');
      setTspAccounts(tspAccounts);
      
      if (tspAccounts.length > 0) {
        const account = tspAccounts[0]; // Use first TSP account
        setSelectedAccount(account);
        if (account.tspAllocation) {
          setAllocation(account.tspAllocation);
        }
      }
    } catch (err) {
      setError('Failed to load TSP accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (fundKey: keyof TSPAllocation, value: string) => {
    if (fundKey === 'lastUpdated') return;
    
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) return;
    
    setAllocation(prev => ({
      ...prev,
      [fundKey]: numValue,
    }));
  };

  const getTotalPercentage = () => {
    return allocation.gFundPercentage + 
           allocation.fFundPercentage + 
           allocation.cFundPercentage + 
           allocation.sFundPercentage + 
           allocation.iFundPercentage +
           allocation.lIncomeFundPercentage +
           allocation.l2030FundPercentage +
           allocation.l2035FundPercentage +
           allocation.l2040FundPercentage +
           allocation.l2045FundPercentage +
           allocation.l2050FundPercentage +
           allocation.l2055FundPercentage +
           allocation.l2060FundPercentage +
           allocation.l2065FundPercentage +
           allocation.l2070FundPercentage +
           allocation.l2075FundPercentage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setError('No TSP account selected');
      return;
    }
    
    const total = getTotalPercentage();
    if (Math.abs(total - 100) > 0.01) {
      setError(`Total allocation must equal 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await accountService.updateTSPAllocation(selectedAccount.accountId, {
        ...allocation,
        lastUpdated: new Date().toISOString(),
      });
      
      setSuccess(true);
      if (onUpdate) onUpdate();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update TSP allocation');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAllocate = (type: 'conservative' | 'moderate' | 'aggressive' | 'lifecycleIncome' | 'lifecycle2040' | 'lifecycle2050' | 'lifecycle2060') => {
    let newAllocation: Partial<TSPAllocation>;
    
    // Reset all allocations first
    const resetAllocation = {
      gFundPercentage: 0,
      fFundPercentage: 0,
      cFundPercentage: 0,
      sFundPercentage: 0,
      iFundPercentage: 0,
      lIncomeFundPercentage: 0,
      l2030FundPercentage: 0,
      l2035FundPercentage: 0,
      l2040FundPercentage: 0,
      l2045FundPercentage: 0,
      l2050FundPercentage: 0,
      l2055FundPercentage: 0,
      l2060FundPercentage: 0,
      l2065FundPercentage: 0,
      l2070FundPercentage: 0,
      l2075FundPercentage: 0,
    };
    
    switch (type) {
      case 'conservative':
        newAllocation = {
          ...resetAllocation,
          gFundPercentage: 40,
          fFundPercentage: 30,
          cFundPercentage: 20,
          sFundPercentage: 5,
          iFundPercentage: 5,
        };
        break;
      case 'moderate':
        newAllocation = {
          ...resetAllocation,
          gFundPercentage: 10,
          fFundPercentage: 20,
          cFundPercentage: 40,
          sFundPercentage: 20,
          iFundPercentage: 10,
        };
        break;
      case 'aggressive':
        newAllocation = {
          ...resetAllocation,
          gFundPercentage: 0,
          fFundPercentage: 10,
          cFundPercentage: 50,
          sFundPercentage: 25,
          iFundPercentage: 15,
        };
        break;
      case 'lifecycleIncome':
        newAllocation = {
          ...resetAllocation,
          lIncomeFundPercentage: 100,
        };
        break;
      case 'lifecycle2040':
        newAllocation = {
          ...resetAllocation,
          l2040FundPercentage: 100,
        };
        break;
      case 'lifecycle2050':
        newAllocation = {
          ...resetAllocation,
          l2050FundPercentage: 100,
        };
        break;
      case 'lifecycle2060':
        newAllocation = {
          ...resetAllocation,
          l2060FundPercentage: 100,
        };
        break;
    }
    
    setAllocation(prev => ({
      ...prev,
      ...newAllocation,
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (tspAccounts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            No TSP Account Found
          </Typography>
          <Typography color="text.secondary">
            Please add a TSP account first to manage your fund allocation.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalPercentage = getTotalPercentage();
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Card>
      <CardHeader
        title="TSP Fund Allocation"
        subheader={`Account: ${selectedAccount?.accountName || 'N/A'} | Balance: $${selectedAccount?.currentBalance.toLocaleString() || '0'}`}
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            TSP allocation updated successfully!
          </Alert>
        )}

        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Quick Allocation Presets:
          </Typography>
          <Grid container spacing={1} mb={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Individual Fund Strategies:
              </Typography>
            </Grid>
          </Grid>
          <Grid container spacing={1} mb={2}>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAutoAllocate('conservative')}
              >
                Conservative
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAutoAllocate('moderate')}
              >
                Moderate
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAutoAllocate('aggressive')}
              >
                Aggressive
              </Button>
            </Grid>
          </Grid>
          <Grid container spacing={1} mb={1}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Lifecycle Fund Strategies:
              </Typography>
            </Grid>
          </Grid>
          <Grid container spacing={1}>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => handleAutoAllocate('lifecycleIncome')}
              >
                L Income (100%)
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => handleAutoAllocate('lifecycle2040')}
              >
                L 2040 (100%)
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => handleAutoAllocate('lifecycle2050')}
              >
                L 2050 (100%)
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => handleAutoAllocate('lifecycle2060')}
              >
                L 2060 (100%)
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        <form onSubmit={handleSubmit}>
          {/* Individual Funds Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'primary.main' }}>
            Individual Funds
          </Typography>
          <Grid container spacing={2}>
            {TSP_FUNDS.filter(fund => fund.category === 'individual').map(({ key, label, description }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  label={label}
                  type="number"
                  value={allocation[key as keyof TSPAllocation]}
                  onChange={(e) => handleAllocationChange(key as keyof TSPAllocation, e.target.value)}
                  helperText={description}
                  InputProps={{
                    endAdornment: '%',
                  }}
                  inputProps={{
                    min: 0,
                    max: 100,
                    step: 0.1,
                  }}
                />
              </Grid>
            ))}
          </Grid>

          {/* Lifecycle Funds Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'secondary.main' }}>
            Lifecycle Funds (Target Date Funds)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Lifecycle funds automatically adjust their asset allocation as you get closer to retirement. 
            Most participants choose either individual funds OR one lifecycle fund, not both.
          </Typography>
          <Grid container spacing={2}>
            {TSP_FUNDS.filter(fund => fund.category === 'lifecycle').map(({ key, label, description }) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <TextField
                  fullWidth
                  label={label}
                  type="number"
                  value={allocation[key as keyof TSPAllocation]}
                  onChange={(e) => handleAllocationChange(key as keyof TSPAllocation, e.target.value)}
                  helperText={description}
                  InputProps={{
                    endAdornment: '%',
                  }}
                  inputProps={{
                    min: 0,
                    max: 100,
                    step: 0.1,
                  }}
                />
              </Grid>
            ))}
          </Grid>

          <Box mt={3} mb={2}>
            <Typography 
              variant="h6" 
              color={isValidTotal ? 'success.main' : 'error.main'}
            >
              Total: {totalPercentage.toFixed(1)}%
            </Typography>
            {!isValidTotal && (
              <Typography variant="body2" color="error">
                Total must equal 100%
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValidTotal || saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Updating...' : 'Update Allocation'}
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              onClick={loadTspAccounts}
            >
              Refresh
            </Button>
          </Box>
        </form>

        {allocation.lastUpdated && (
          <Typography variant="body2" color="text.secondary" mt={2}>
            Last updated: {new Date(allocation.lastUpdated).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};