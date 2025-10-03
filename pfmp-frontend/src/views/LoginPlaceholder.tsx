import { useAuth } from '../contexts/auth/useAuth';

export default function LoginPlaceholder() {
  const { login, isAuthenticated, isDev } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      {isAuthenticated ? (
        <p>You are already authenticated. (Dev mode: {String(isDev)})</p>
      ) : (
        <button onClick={login}>Sign In</button>
      )}
      {isDev && <p style={{marginTop:16}}>Dev bypass active – login optional.</p>}
    </div>
  );
}
