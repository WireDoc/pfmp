import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './onboarding/OnboardingContext';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { pfmpTheme } from './theme/pfmpTheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={pfmpTheme}>
      <CssBaseline />
      <AuthProvider>
        <OnboardingProvider>
          <AppRouter />
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
