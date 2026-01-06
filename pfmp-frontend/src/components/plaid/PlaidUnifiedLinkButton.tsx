/**
 * PlaidUnifiedLinkButton Component (Wave 12.5)
 * 
 * A button that initiates the Plaid Link flow for multiple products.
 * Supports transactions, investments, and liabilities (credit cards, mortgages, student loans).
 * Uses react-plaid-link for the Link widget and our unified backend API for token exchange.
 */

import React, { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import type { PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { 
  Button, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { 
  createUnifiedLinkToken, 
  exchangeUnifiedPublicToken,
  type PlaidProduct,
  type UnifiedExchangeResult,
} from '../../services/plaidApi';

export interface PlaidUnifiedLinkButtonProps {
  /** User ID for API calls (required in dev mode) */
  userId: number;
  /** Callback when accounts are successfully linked */
  onSuccess?: (result: UnifiedExchangeResult) => void;
  /** Callback when the user exits Plaid Link without completing */
  onExit?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Button variant */
  variant?: 'contained' | 'outlined' | 'text';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Button color */
  color?: 'primary' | 'secondary' | 'success' | 'inherit';
  /** Custom button text */
  buttonText?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Pre-selected products (skip selection dialog) */
  defaultProducts?: PlaidProduct[];
  /** Skip product selection dialog and use defaults */
  skipProductSelection?: boolean;
}

interface ProductOption {
  value: PlaidProduct;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PRODUCT_OPTIONS: ProductOption[] = [
  {
    value: 'transactions',
    label: 'Bank Accounts',
    description: 'Checking, savings, and money market accounts',
    icon: <AccountBalanceIcon />,
  },
  {
    value: 'investments',
    label: 'Investments',
    description: 'Brokerage, IRA, 401(k), and other investment accounts',
    icon: <TrendingUpIcon />,
  },
  {
    value: 'liabilities',
    label: 'Credit Cards & Loans',
    description: 'Credit cards, mortgages, and student loans',
    icon: <CreditCardIcon />,
  },
];

export const PlaidUnifiedLinkButton: React.FC<PlaidUnifiedLinkButtonProps> = ({
  userId,
  onSuccess,
  onExit,
  onError,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  buttonText = 'Link Account',
  showIcon = true,
  fullWidth = false,
  disabled = false,
  defaultProducts = ['transactions'],
  skipProductSelection = false,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Product selection dialog state
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<PlaidProduct[]>(defaultProducts);
  const [pendingProducts, setPendingProducts] = useState<PlaidProduct[]>([]);

  // Fetch link token with selected products
  const fetchLinkToken = useCallback(async (products: PlaidProduct[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await createUnifiedLinkToken(userId, products);
      setLinkToken(token);
      setPendingProducts(products);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize connection';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [userId, onError]);

  // Handle successful Plaid Link completion
  const handleOnSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setIsExchanging(true);
      setError(null);
      
      try {
        console.log('Plaid Link (unified) success, exchanging token...', metadata);
        
        // Extract institution info from Plaid Link metadata
        const typedMetadata = metadata as { institution?: { institution_id?: string; name?: string } };
        const institutionId = typedMetadata.institution?.institution_id;
        const institutionName = typedMetadata.institution?.name;
        
        const result = await exchangeUnifiedPublicToken(
          publicToken, 
          userId, 
          pendingProducts,
          institutionId, 
          institutionName
        );
        
        const productLabels = pendingProducts.map(p => {
          const opt = PRODUCT_OPTIONS.find(o => o.value === p);
          return opt?.label || p;
        }).join(', ');
        
        setSuccessMessage(
          `Successfully linked ${result.accountsLinked} account${result.accountsLinked > 1 ? 's' : ''} from ${result.institutionName} (${productLabels})`
        );
        
        onSuccess?.(result);
        
        // Reset state for next linking
        setLinkToken(null);
        setPendingProducts([]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to link account';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsExchanging(false);
      }
    },
    [userId, pendingProducts, onSuccess, onError]
  );

  // Handle Plaid Link exit
  const handleOnExit = useCallback(() => {
    console.log('Plaid Link (unified) exited');
    setLinkToken(null);
    setPendingProducts([]);
    onExit?.();
  }, [onExit]);

  // Plaid Link configuration
  const config: PlaidLinkOptions = {
    token: linkToken || '',
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  // Open Plaid Link when token is ready
  React.useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleButtonClick = () => {
    if (skipProductSelection) {
      // Use default products directly
      fetchLinkToken(defaultProducts);
    } else {
      // Show product selection dialog
      setSelectedProducts(defaultProducts);
      setShowProductDialog(true);
    }
  };

  const handleProductToggle = (product: PlaidProduct) => {
    setSelectedProducts(prev => {
      if (prev.includes(product)) {
        // Don't allow deselecting the last product
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== product);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleProductDialogConfirm = () => {
    setShowProductDialog(false);
    fetchLinkToken(selectedProducts);
  };

  const handleProductDialogCancel = () => {
    setShowProductDialog(false);
  };

  const isButtonDisabled = disabled || isLoading || isExchanging;

  return (
    <Box>
      <Button
        variant={variant}
        size={size}
        color={color}
        onClick={handleButtonClick}
        disabled={isButtonDisabled}
        fullWidth={fullWidth}
        startIcon={
          isLoading || isExchanging ? (
            <CircularProgress size={20} color="inherit" />
          ) : showIcon ? (
            <LinkIcon />
          ) : null
        }
      >
        {isLoading ? 'Initializing...' : isExchanging ? 'Linking...' : buttonText}
      </Button>

      {/* Product Selection Dialog */}
      <Dialog 
        open={showProductDialog} 
        onClose={handleProductDialogCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            Select Account Types
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which types of accounts you want to link from this institution.
            You can always add more later.
          </Typography>
          
          <FormGroup>
            {PRODUCT_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={selectedProducts.includes(option.value)}
                    onChange={() => handleProductToggle(option.value)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 }}>
                    <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                      {option.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{option.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  alignItems: 'flex-start',
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: selectedProducts.includes(option.value) ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              />
            ))}
          </FormGroup>

          {selectedProducts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Selected:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {selectedProducts.map(p => {
                  const opt = PRODUCT_OPTIONS.find(o => o.value === p);
                  return (
                    <Chip 
                      key={p} 
                      label={opt?.label || p} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  );
                })}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProductDialogCancel}>Cancel</Button>
          <Button 
            onClick={handleProductDialogConfirm} 
            variant="contained"
            disabled={selectedProducts.length === 0}
          >
            Continue to Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlaidUnifiedLinkButton;
