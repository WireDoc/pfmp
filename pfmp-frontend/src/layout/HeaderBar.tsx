import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/auth/useAuth';
import { LogoMark } from '../components/branding/LogoMark';

export function HeaderBar() {
  const { user, isAuthenticated, isDev } = useAuth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoMark variant="dualtone" size={36} />
        <div>
          <div style={{ fontWeight: 800, letterSpacing: 0.5, color: '#fff' }}>PFMP</div>
          <div style={{ fontSize: 11, opacity: 0.8, color: '#cbd5e1' }}>Personal Financial Management Platform</div>
        </div>
        {isDev && (
          <span style={{ marginLeft: 8, padding: '2px 6px', background: '#fbbf24', color: '#111827', borderRadius: 4, fontSize: 12 }}>DEV</span>
        )}
        <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>v0.7.0-alpha</span>
      </div>

      <nav style={{ display: 'flex', gap: 16, marginLeft: 24 }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#38bdf8' : '#e2e8f0' })}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/onboarding"
          style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#38bdf8' : '#e2e8f0' })}
        >
          Onboarding
        </NavLink>
        <NavLink
          to="/login"
          style={({ isActive }) => ({ textDecoration: 'none', fontSize: 13, color: isActive ? '#38bdf8' : '#e2e8f0' })}
        >
          Login
        </NavLink>
      </nav>

      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#e2e8f0' }}>
        {isAuthenticated ? `User: ${user?.name || 'SimUser'}` : 'Guest'}
      </div>
    </div>
  );
}
