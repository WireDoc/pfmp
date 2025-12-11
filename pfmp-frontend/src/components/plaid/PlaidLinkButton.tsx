/**
 * PlaidLinkButton Component (Wave 11)
 * 
 * A button that initiates the Plaid Link flow to connect bank accounts.
 * Uses react-plaid-link for the Link widget and our backend API for token exchange.
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
  Typography
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { createLinkToken, exchangePublicToken } from '../../services/plaidApi';
import type { PlaidConnection, PlaidAccount } from '../../services/plaidApi';

export interface PlaidLinkButtonProps {
  /** Callback when bank accounts are successfully linked */
  onSuccess?: (connection: PlaidConnection, accounts: PlaidAccount[]) => void;
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
}

export const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({
  onSuccess,
  onExit,
  onError,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  buttonText = 'Link Bank Account',
  showIcon = true,
  fullWidth = false,
  disabled = false,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch link token when user clicks the button
  const fetchLinkToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await createLinkToken();
      setLinkToken(token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize bank connection';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Handle successful Plaid Link completion
  const handleOnSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setIsExchanging(true);
      setError(null);
      
      try {
        console.log('Plaid Link success, exchanging token...', metadata);
        
        const result = await exchangePublicToken(publicToken);
        
        setSuccessMessage(
          `Successfully linked ${result.accounts.length} account${result.accounts.length > 1 ? 's' : ''} from ${result.connection.institutionName}`
        );
        
        onSuccess?.(result.connection, result.accounts);
        
        // Reset link token so user can link another bank
        setLinkToken(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to link bank account';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsExchanging(false);
      }
    },
    [onSuccess, onError]
  );

  // Handle Plaid Link exit
  const handleOnExit = useCallback(() => {
    console.log('Plaid Link exited');
    setLinkToken(null);
    onExit?.();
  }, [onExit]);

  // Plaid Link configuration - only create when we have a token
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

  const handleClick = () => {
    if (!linkToken) {
      fetchLinkToken();
    } else if (ready) {
      open();
    }
  };

  const isButtonDisabled = disabled || isLoading || isExchanging;

  return (
    <Box>
      <Button
        variant={variant}
        size={size}
        color={color}
        onClick={handleClick}
        disabled={isButtonDisabled}
        fullWidth={fullWidth}
        startIcon={
          isLoading || isExchanging ? (
            <CircularProgress size={20} color="inherit" />
          ) : showIcon ? (
            <AccountBalanceIcon />
          ) : null
        }
      >
        {isLoading ? 'Initializing...' : isExchanging ? 'Linking...' : buttonText}
      </Button>

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

/**
 * A larger CTA version of the PlaidLinkButton for dashboard use
 */
export const PlaidLinkCTA: React.FC<{
  onSuccess?: (connection: PlaidConnection, accounts: PlaidAccount[]) => void;
}> = ({ onSuccess }) => {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalanceIcon fontSize="large" />
        <Typography variant="h6" fontWeight="bold">
          Connect Your Bank
        </Typography>
      </Box>
      
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        Link your bank accounts to automatically sync your balances. 
        We use bank-level encryption to keep your data secure.
      </Typography>
      
      <PlaidLinkButton
        variant="contained"
        color="inherit"
        buttonText="Link Account"
        showIcon={false}
        onSuccess={onSuccess}
      />
    </Box>
  );
};

// Extended props for custom styling
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    inherit: true;
  }
}

export default PlaidLinkButton;
