import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';
import { HeaderBar } from './HeaderBar';
import { DevFlagsPanel } from '../components/dev/DevFlagsPanel';
import { DevUserSwitcher } from '../dev/DevUserSwitcher';

export function AppLayout() {
  const { isDev } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', background: '#fafafa' }}>
        <HeaderBar />
      </header>
      <main style={{ flex: 1 }}>
        {isDev && (
          <div style={{ padding: '12px 16px 0' }}>
            <DevUserSwitcher />
          </div>
        )}
        <Outlet />
      </main>
      <footer style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #ddd', fontSize: 12 }}>
        © {new Date().getFullYear()} PFMP
      </footer>
      {isDev && <DevFlagsPanel />}
    </div>
  );
}
