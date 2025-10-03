import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404 - Not Found</h1>
      <p>The page you requested does not exist.</p>
      <p><Link to="/">Return to Dashboard</Link></p>
    </div>
  );
}
