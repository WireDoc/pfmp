/**
 * PlaidInvestmentsLinkButton Component (Wave 12)
 * 
 * A button that initiates the Plaid Link flow for investment accounts.
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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { createInvestmentsLinkToken, exchangeInvestmentsPublicToken } from '../../services/plaidApi';
import type { PlaidConnection } from '../../services/plaidApi';

export interface PlaidInvestmentsLinkButtonProps {
  /** User ID for API calls (required in dev mode) */
  userId: number;
  /** Callback when investment accounts are successfully linked */
  onSuccess?: (connection: PlaidConnection, accountsCreated: number) => void;
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

export const PlaidInvestmentsLinkButton: React.FC<PlaidInvestmentsLinkButtonProps> = ({
  userId,
  onSuccess,
  onExit,
  onError,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  buttonText = 'Link Investment Account',
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
      const token = await createInvestmentsLinkToken(userId);
      setLinkToken(token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize investment connection';
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
        console.log('Plaid Link (investments) success, exchanging token...', metadata);
        
        // Extract institution info from Plaid Link metadata
        const typedMetadata = metadata as { institution?: { institution_id?: string; name?: string } };
        const institutionId = typedMetadata.institution?.institution_id;
        const institutionName = typedMetadata.institution?.name;
        
        const result = await exchangeInvestmentsPublicToken(publicToken, userId, institutionId, institutionName);
        
        setSuccessMessage(
          `Successfully linked ${result.accountsCreated} investment account${result.accountsCreated > 1 ? 's' : ''} from ${result.connection.institutionName}`
        );
        
        onSuccess?.(result.connection, result.accountsCreated);
        
        // Reset link token so user can link another brokerage
        setLinkToken(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to link investment account';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsExchanging(false);
      }
    },
    [userId, onSuccess, onError]
  );

  // Handle Plaid Link exit
  const handleOnExit = useCallback(() => {
    console.log('Plaid Link (investments) exited');
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
            <TrendingUpIcon />
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
 * A larger CTA version of the PlaidInvestmentsLinkButton for dashboard use
 */
export const PlaidInvestmentsCTA: React.FC<{
  userId: number;
  onSuccess?: (connection: PlaidConnection, accountsCreated: number) => void;
}> = ({ userId, onSuccess }) => {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon fontSize="large" />
        <Typography variant="h6" fontWeight="bold">
          Connect Your Brokerage
        </Typography>
      </Box>
      
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        Link your investment accounts to automatically sync your portfolio holdings. 
        Track your 401(k), IRA, and brokerage accounts all in one place.
      </Typography>
      
      <PlaidInvestmentsLinkButton
        userId={userId}
        variant="contained"
        color="inherit"
        buttonText="Link Investments"
        showIcon={false}
        onSuccess={onSuccess}
      />
    </Box>
  );
};

export default PlaidInvestmentsLinkButton;
