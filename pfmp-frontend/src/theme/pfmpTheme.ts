import { createTheme } from '@mui/material/styles';

// Minimal theme foundation – can expand palette & typography gradually.
export const pfmpTheme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#455a64' },
    background: { default: '#f8f9fb' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.2rem', fontWeight: 600 },
    h2: { fontSize: '1.6rem', fontWeight: 600 },
    h3: { fontSize: '1.3rem', fontWeight: 600 },
  },
  shape: { borderRadius: 6 },
});
