import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { transitionToDetailed, type InitialHoldingRequest, type AccountResponse } from '../../services/accountsApi';

// Asset types matching backend AssetType enum (Models/Holding.cs)
const ASSET_TYPES = [
  // Equities
  { value: 0, label: 'Stock' },
  { value: 1, label: 'ETF' },
  { value: 2, label: 'Mutual Fund' },
  { value: 3, label: 'Index' },
  // Fixed Income
  { value: 4, label: 'Bond' },
  { value: 5, label: 'Treasury Bill' },
  { value: 6, label: 'Corporate Bond' },
  { value: 7, label: 'Municipal Bond' },
  // Cash Equivalents
  { value: 8, label: 'Cash' },
  { value: 9, label: 'Money Market' },
  { value: 10, label: 'Certificate of Deposit' },
  // Cryptocurrency
  { value: 11, label: 'Cryptocurrency' },
  { value: 12, label: 'Crypto Staking' },
  { value: 13, label: 'DeFi Token' },
  { value: 14, label: 'NFT' },
  // Alternatives
  { value: 15, label: 'Real Estate' },
  { value: 16, label: 'REIT' },
  { value: 17, label: 'Commodity' },
  { value: 18, label: 'Precious Metal' },
  // TSP Funds
  { value: 19, label: 'TSP G Fund' },
  { value: 20, label: 'TSP F Fund' },
  { value: 21, label: 'TSP C Fund' },
  { value: 22, label: 'TSP S Fund' },
  { value: 23, label: 'TSP I Fund' },
  { value: 24, label: 'TSP Lifecycle Fund' },
  // Other
  { value: 25, label: 'Option' },
  { value: 26, label: 'Futures' },
  { value: 27, label: 'Other' },
];

interface AccountSetupWizardProps {
  open: boolean;
  account: AccountResponse;
  onClose: () => void;
  onComplete: (updatedAccount: AccountResponse) => void;
}

interface HoldingRow {
  id: string;
  symbol: string;
  name: string;
  assetType: number;
  quantity: string;
  price: string;
  total: string;
  fee: string;
  acquisitionDate: Date | null;
}

const steps = ['Introduction', 'Add Holdings', 'Review & Complete'];

export function AccountSetupWizard({ open, account, onClose, onComplete }: AccountSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [holdings, setHoldings] = useState<HoldingRow[]>([
    { id: '1', symbol: '', name: '', assetType: 1, quantity: '', price: '', total: '', fee: '', acquisitionDate: new Date() },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (activeStep === 1) {
      // Validate holdings before proceeding to review
      const validation = validateHoldings();
      if (!validation.isValid) {
        setError(validation.error || 'Please fix the errors before proceeding');
        return;
      }
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleAddHolding = () => {
    setHoldings([
      ...holdings,
      { id: Date.now().toString(), symbol: '', name: '', assetType: 1, quantity: '', price: '', total: '', fee: '', acquisitionDate: new Date() },
    ]);
  };

  const handleRemoveHolding = (id: string) => {
    if (holdings.length === 1) {
      setError('You must have at least one holding');
      return;
    }
    setHoldings(holdings.filter((h) => h.id !== id));
  };

  const handleHoldingChange = (id: string, field: keyof HoldingRow, value: string | number | Date | null) => {
    setHoldings(holdings.map((h) => {
      if (h.id !== id) return h;
      
      const updated = { ...h, [field]: value };
      
      // Tri-directional auto-calculation for quantity/price/total
      if (field === 'quantity' || field === 'price' || field === 'total') {
        const qty = parseFloat(updated.quantity) || 0;
        const price = parseFloat(updated.price) || 0;
        const total = parseFloat(updated.total) || 0;
        
        if (field === 'quantity' && qty > 0 && price > 0) {
          // Quantity changed: recalc total
          updated.total = (qty * price).toFixed(2);
        } else if (field === 'price' && price > 0 && qty > 0) {
          // Price changed: recalc total
          updated.total = (qty * price).toFixed(2);
        } else if (field === 'total' && total > 0) {
          // Total changed: recalc quantity (if price exists) or price (if quantity exists)
          if (price > 0) {
            updated.quantity = (total / price).toFixed(8);
          } else if (qty > 0) {
            updated.price = (total / qty).toFixed(2);
          }
        }
      }
      
      return updated;
    }));
    setError(null);
  };

  const calculateTotal = (): number => {
    return holdings.reduce((sum, h) => {
      const quantity = parseFloat(h.quantity) || 0;
      const price = parseFloat(h.price) || 0;
      return sum + quantity * price;
    }, 0);
  };

  const validateHoldings = (): { isValid: boolean; error?: string } => {
    // Check all fields are filled
    for (const holding of holdings) {
      if (!holding.symbol.trim()) {
        return { isValid: false, error: 'All holdings must have a symbol' };
      }
      if (!holding.quantity || parseFloat(holding.quantity) <= 0) {
        return { isValid: false, error: 'All holdings must have a valid quantity' };
      }
      if (!holding.price || parseFloat(holding.price) <= 0) {
        return { isValid: false, error: 'All holdings must have a valid price' };
      }
      if (!holding.acquisitionDate) {
        return { isValid: false, error: 'All holdings must have an acquisition date' };
      }
    }

    // Check total matches balance
    const total = calculateTotal();
    const balanceDiff = Math.abs(total - account.currentBalance);
    
    if (balanceDiff > 0.01) {
      return {
        isValid: false,
        error: `Holdings total ($${total.toFixed(2)}) must match account balance ($${account.currentBalance.toFixed(2)})`,
      };
    }

    return { isValid: true };
  };

  const handleSubmit = async () => {
    const validation = validateHoldings();
    if (!validation.isValid) {
      setError(validation.error || 'Validation failed');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: InitialHoldingRequest[] = holdings.map((h) => ({
        symbol: h.symbol.trim(),
        name: h.name.trim() || h.symbol.trim(),
        assetType: h.assetType,
        quantity: parseFloat(h.quantity),
        price: parseFloat(h.price),
        ...(h.fee && parseFloat(h.fee) > 0 ? { fee: parseFloat(h.fee) } : {}),
        ...(h.acquisitionDate ? { purchaseDate: h.acquisitionDate.toISOString() } : {}),
      }));

      // Use the earliest acquisition date for the account transition
      const earliestDate = holdings.reduce((earliest, h) => {
        return !earliest || (h.acquisitionDate && h.acquisitionDate < earliest) ? h.acquisitionDate : earliest;
      }, null as Date | null);

      const updatedAccount = await transitionToDetailed(account.accountId, {
        holdings: request,
        acquisitionDate: (earliestDate || new Date()).toISOString(),
      });

      onComplete(updatedAccount);
    } catch (err) {
      console.error('Error completing setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (activeStep > 0) {
      const confirm = window.confirm('Are you sure you want to cancel? Your progress will be lost.');
      if (!confirm) return;
    }
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Welcome to Account Setup
            </Typography>
            <Typography paragraph>
              This wizard will help you add your holdings breakdown to unlock all analytics features for this account.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Current Account Balance:</strong> ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2">
                You'll need to add holdings that total exactly this amount.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              What You'll Need
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • <strong>Symbol</strong> - Stock ticker or asset identifier (e.g., VTI, BTC-USD)
              </Typography>
              <Typography variant="body2">
                • <strong>Quantity</strong> - Number of shares/units you own
              </Typography>
              <Typography variant="body2">
                • <strong>Price</strong> - Cost per share/unit at acquisition
              </Typography>
              <Typography variant="body2">
                • <strong>Acquisition Date</strong> - When you acquired these holdings
              </Typography>
            </Stack>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This is a one-time setup. Once completed, you cannot return 
                to simple balance mode. The balance will be calculated from your holdings going forward.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        {
          const total = calculateTotal();
          const balanceDiff = total - account.currentBalance;
          const isValid = Math.abs(balanceDiff) <= 0.01;

          return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Add Your Holdings</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddHolding} variant="outlined" size="small">
                Add Holding
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 120 }}>Symbol</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Name (Optional)</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Asset Type</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Fee</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Acq. Date</TableCell>
                    <TableCell width={50}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding) => {
                    return (
                      <TableRow key={holding.id}>
                        <TableCell>
                          <TextField
                            value={holding.symbol}
                            onChange={(e) => handleHoldingChange(holding.id, 'symbol', e.target.value.toUpperCase())}
                            size="small"
                            placeholder="VTI"
                            required
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={holding.name}
                            onChange={(e) => handleHoldingChange(holding.id, 'name', e.target.value)}
                            size="small"
                            placeholder="Optional"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={holding.assetType}
                            onChange={(e) => handleHoldingChange(holding.id, 'assetType', parseInt(e.target.value))}
                            size="small"
                            sx={{ minWidth: 150 }}
                          >
                            {ASSET_TYPES.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={holding.quantity}
                            onChange={(e) => handleHoldingChange(holding.id, 'quantity', e.target.value)}
                            type="number"
                            size="small"
                            placeholder="0"
                            inputProps={{ min: 0, step: 'any' }}
                            required
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={holding.price}
                            onChange={(e) => handleHoldingChange(holding.id, 'price', e.target.value)}
                            type="number"
                            size="small"
                            placeholder="0.00"
                            inputProps={{ min: 0, step: 'any' }}
                            required
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={holding.total}
                            onChange={(e) => handleHoldingChange(holding.id, 'total', e.target.value)}
                            type="number"
                            size="small"
                            placeholder="0.00"
                            inputProps={{ min: 0, step: 'any' }}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={holding.fee}
                            onChange={(e) => handleHoldingChange(holding.id, 'fee', e.target.value)}
                            type="number"
                            size="small"
                            placeholder="0.00"
                            inputProps={{ min: 0, step: 'any' }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell>
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              value={holding.acquisitionDate}
                              onChange={(newValue) => handleHoldingChange(holding.id, 'acquisitionDate', newValue)}
                              slotProps={{ 
                                textField: { 
                                  size: 'small',
                                  required: true
                                } 
                              }}
                            />
                          </LocalizationProvider>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveHolding(holding.id)}
                            disabled={holdings.length === 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Paper sx={{ p: 2, bgcolor: isValid ? 'success.light' : 'warning.light' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">
                  Holdings Total: <strong>${total.toFixed(2)}</strong>
                </Typography>
                <Typography variant="subtitle2">
                  Account Balance: <strong>${account.currentBalance.toFixed(2)}</strong>
                </Typography>
                <Typography variant="subtitle2" color={isValid ? 'success.main' : 'warning.main'}>
                  Difference: <strong>${Math.abs(balanceDiff).toFixed(2)}</strong>
                </Typography>
              </Box>
              {!isValid && (
                <Typography variant="caption" color="warning.dark" sx={{ mt: 1, display: 'block' }}>
                  Holdings total must match account balance within $0.01
                </Typography>
              )}
            </Paper>
          </Box>
        );
        }

      case 2:
        {
          const reviewTotal = calculateTotal();
          return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Holdings
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your holdings total matches the account balance: ${reviewTotal.toFixed(2)}
              </Typography>
            </Alert>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Acq. Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding) => {
                    const value = (parseFloat(holding.quantity) || 0) * (parseFloat(holding.price) || 0);
                    const assetTypeName = ASSET_TYPES.find((t) => t.value === holding.assetType)?.label || 'Unknown';
                    return (
                      <TableRow key={holding.id}>
                        <TableCell><strong>{holding.symbol}</strong></TableCell>
                        <TableCell>{holding.name || holding.symbol}</TableCell>
                        <TableCell>{assetTypeName}</TableCell>
                        <TableCell align="right">{parseFloat(holding.quantity).toFixed(4)}</TableCell>
                        <TableCell align="right">${parseFloat(holding.price).toFixed(2)}</TableCell>
                        <TableCell align="right">${value.toFixed(2)}</TableCell>
                        <TableCell>
                          {holding.acquisitionDate?.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={6} align="right"><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>${reviewTotal.toFixed(2)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="warning">
              <Typography variant="body2" gutterBottom>
                <strong>Ready to Complete Setup?</strong>
              </Typography>
              <Typography variant="body2">
                Clicking "Complete Setup" will:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1, pl: 2 }}>
                • Create {holdings.length} holding{holdings.length > 1 ? 's' : ''} in your account<br />
                • Generate initial purchase transactions<br />
                • Enable all analytics features<br />
                • <strong>Lock the account balance</strong> (calculated from holdings going forward)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This action cannot be undone.
              </Typography>
            </Alert>
          </Box>
        );
        }

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
      <DialogTitle>
        Account Setup Wizard
        <Typography variant="body2" color="text.secondary">
          {account.accountName} - {account.institution}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={submitting}>
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} startIcon={<BackIcon />} disabled={submitting}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} endIcon={<ForwardIcon />} variant="contained">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            startIcon={submitting ? <CircularProgress size={16} /> : <CompleteIcon />}
            variant="contained"
            color="success"
            disabled={submitting}
          >
            {submitting ? 'Completing...' : 'Complete Setup'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
