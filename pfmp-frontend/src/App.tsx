import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Suspense, lazy } from 'react';
import { DevUserSwitcher } from './dev/DevUserSwitcher';
const Dashboard = lazy(() => import('./components/Dashboard'));

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.5rem 1rem' }}>
        <DevUserSwitcher />
        <Suspense fallback={<div style={{padding:40}}>Loading dashboard...</div>}>
          <Dashboard userId={1} />
        </Suspense>
      </div>
    </ThemeProvider>
  );
}

export default App;
