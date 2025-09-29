import React, { useEffect, useState, useCallback } from 'react';
import { adviceService, Advice } from '../services/api';

interface AdviceListProps {
  userId: number;
  autoRefreshMs?: number; // optional polling interval
}

const AdviceList: React.FC<AdviceListProps> = ({ userId, autoRefreshMs }) => {
  const [items, setItems] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await adviceService.getForUser(userId);
      setItems(data);
    } catch (e) {
      setError('Failed to load advice');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(load, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, load]);

  if (!userId) {
    return <div>No user selected.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Advice</h2>
        <button onClick={load} disabled={loading} style={{ padding: '0.4rem 0.8rem' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {items.length === 0 && !loading && <div>No advice yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(a => (
          <li key={a.adviceId} style={{ border: '1px solid #ccc', padding: '0.75rem', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>#{a.adviceId} · {new Date(a.createdAt).toLocaleString()} · Status: {a.status}</div>
            {a.theme && <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Theme: {a.theme}</div>}
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{a.consensusText || '(empty)'}</p>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Confidence: {a.confidenceScore}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdviceList;
