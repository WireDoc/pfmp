import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';

export function AppLayout() {
  const { user, isAuthenticated, isDev } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', background: '#fafafa' }}>
        <strong>PFMP</strong>
        <span style={{ marginLeft: 16, fontSize: 12, opacity: 0.8 }}>v0.7.0-alpha</span>
        {isDev && <span style={{ marginLeft: 8, padding: '2px 6px', background: '#ffe58a', borderRadius: 4, fontSize: 12 }}>DEV</span>}
        <span style={{ float: 'right', fontSize: 12 }}>
          {isAuthenticated ? `User: ${user?.name || 'SimUser'}` : 'Guest'}
        </span>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #ddd', fontSize: 12 }}>
        © {new Date().getFullYear()} PFMP
      </footer>
    </div>
  );
}
