import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';
import { HeaderBar } from './HeaderBar';
import { DevFlagsPanel } from '../components/dev/DevFlagsPanel';
import { DevUserSwitcher } from '../dev/DevUserSwitcher';
import { useDevUserInit } from '../dev/useDevUserInit';

export function AppLayout() {
  const { isDev } = useAuth();
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  // Ensure dev user store is initialized before any route guards evaluate.
  useDevUserInit();
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header
        style={{
          padding: '12px 20px',
          background: '#0f172a',
          color: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.24)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <HeaderBar />
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
        {isDev && !isDashboardRoute && (
          <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
            <DevUserSwitcher />
          </div>
        )}
      </main>
      <footer style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #ddd', fontSize: 12 }}>
        © {new Date().getFullYear()} PFMP
      </footer>
      {isDev && <DevFlagsPanel />}
    </div>
  );
}
