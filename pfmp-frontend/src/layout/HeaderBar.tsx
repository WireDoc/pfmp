import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';

export function HeaderBar() {
  const { user, isAuthenticated, isDev } = useAuth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div>
        <strong>PFMP</strong>
        <span style={{ marginLeft: 16, fontSize: 12, opacity: 0.8 }}>v0.7.0-alpha</span>
        {isDev && <span style={{ marginLeft: 8, padding: '2px 6px', background: '#ffe58a', borderRadius: 4, fontSize: 12 }}>DEV</span>}
      </div>
      <nav style={{ display: 'flex', gap: 12 }}>
        <NavLink to="/" style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#1976d2' : '#333' })}>Dashboard</NavLink>
        <NavLink to="/onboarding" style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#1976d2' : '#333' })}>Onboarding</NavLink>
        <NavLink to="/login" style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#1976d2' : '#333' })}>Login</NavLink>
      </nav>
      <div style={{ marginLeft: 'auto', fontSize: 12 }}>
        {isAuthenticated ? `User: ${user?.name || 'SimUser'}` : 'Guest'}
      </div>
    </div>
  );
}
