import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';
import { HeaderBar } from './HeaderBar';
import { DevFlagsPanel } from '../components/dev/DevFlagsPanel';

export function AppLayout() {
  const { isDev } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', background: '#fafafa' }}>
        <HeaderBar />
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #ddd', fontSize: 12 }}>
        © {new Date().getFullYear()} PFMP
      </footer>
      {isDev && <DevFlagsPanel />}
    </div>
  );
}
