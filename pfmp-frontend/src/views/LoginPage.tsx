import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { useAuth } from '../contexts/auth/useAuth';
import { updateFlags } from '../flags/featureFlags';
import { LogoMark } from '../components/branding/LogoMark';

/** Microsoft's four-square logo, inlined so no external asset is needed. */
function MicrosoftLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/**
 * Wave 25 Phase E — real sign-in page. `login()` runs MSAL loginRedirect for the
 * PFMP API scope; on return, AuthProvider finishes the round-trip (token →
 * /auth/me → provision/resolve the PFMP user) and ProtectedRoute lets the app in.
 * Dev builds keep an escape hatch back to simulated auth.
 */
export default function LoginPage() {
  const { login, isAuthenticated, loading, error, isDev } = useAuth();

  if (isAuthenticated || isDev) {
    return <Navigate to="/" replace />;
  }

  const useSimulatedAuth = () => {
    updateFlags({ use_simulated_auth: true }); // persisted override
    window.location.assign('/'); // full reload so AuthProvider re-initializes
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      }}
    >
      <Paper elevation={8} sx={{ p: 5, maxWidth: 420, width: '100%', textAlign: 'center', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <LogoMark variant="dualtone" size={56} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
          PFMP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 4 }}>
          Personal Financial Management Platform
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Checking your session…
            </Typography>
          </Box>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<MicrosoftLogo />}
            onClick={() => void login()}
            sx={{ textTransform: 'none', fontWeight: 600, py: 1.25 }}
          >
            Sign in with Microsoft
          </Button>
        )}

        {import.meta.env.DEV && (
          <>
            <Divider sx={{ my: 3, fontSize: 12, color: 'text.secondary' }}>development</Divider>
            <Button variant="text" size="small" onClick={useSimulatedAuth} sx={{ textTransform: 'none' }}>
              Use simulated dev auth instead
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
