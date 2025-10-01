import React, { useEffect, useState, useCallback } from 'react';
import { adviceService } from '../services/api';
import type { Advice } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface AdviceListProps {
  userId: number;
  autoRefreshMs?: number; // optional polling interval
}

const AdviceList: React.FC<AdviceListProps> = ({ userId, autoRefreshMs }) => {
  const [items, setItems] = useState<Advice[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const statusesParam = statusFilter === 'ALL' ? undefined : statusFilter;
      const { data } = await adviceService.getForUser(userId, statusesParam);
      setItems(data);
    } catch {
      setError('Failed to load advice');
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter]);

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
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Advice</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={ev => setShowDismissed(ev.target.checked)}
            />
            Show dismissed
          </label>
          <select
            value={statusFilter}
            onChange={ev => {
              const val = ev.target.value;
              if (val === 'ALL' || val === 'Proposed' || val === 'Accepted' || val === 'Dismissed') {
                setStatusFilter(val);
              }
            }}
            style={{ padding: '0.3rem', fontSize: '0.75rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Proposed">Proposed</option>
            <option value="Accepted">Accepted</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <button onClick={load} disabled={loading} style={{ padding: '0.4rem 0.8rem' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {items.length === 0 && !loading && <div>No advice yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items
          .filter(a => showDismissed || a.status !== 'Dismissed')
          .map(a => (
          <li key={a.adviceId} style={{ border: '1px solid #ccc', padding: '0.75rem', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>#{a.adviceId} · {new Date(a.createdAt).toLocaleString()}</div>
              <StatusBadge status={a.status} />
            </div>
            {a.theme && <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Theme: {a.theme}</div>}
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{a.consensusText || '(empty)'}</p>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Confidence: {a.confidenceScore}</div>
            {a.status === 'Accepted' && a.linkedTaskId && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>Linked Task ID: {a.linkedTaskId}</span>
                <a
                  href={"/tasks/" + a.linkedTaskId}
                  title={"Open task " + a.linkedTaskId}
                  style={{
                    fontSize: '0.65rem',
                    textDecoration: 'none',
                    background: '#263238',
                    color: '#fff',
                    padding: '0.25rem 0.55rem',
                    borderRadius: 4
                  }}
                >View Task</a>
              </div>
            )}
            {a.status === 'Proposed' && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={async () => {
                    setItems(prev => prev.map(it => it.adviceId === a.adviceId ? { ...it, status: 'Accepted' } : it));
                    try {
                      await adviceService.accept(a.adviceId);
                      await load();
                    } catch {
                      setItems(prev => prev.map(it => it.adviceId === a.adviceId ? { ...it, status: a.status } : it));
                      setError('Failed to accept advice');
                    }
                  }}
                  style={{ padding: '0.35rem 0.7rem', background: '#1b5e20', color: '#fff', border: 'none', borderRadius: 4 }}
                >Accept</button>
                <button
                  onClick={async () => {
                    setItems(prev => prev.map(it => it.adviceId === a.adviceId ? { ...it, status: 'Dismissed' } : it));
                    try {
                      await adviceService.dismiss(a.adviceId);
                    } catch {
                      setItems(prev => prev.map(it => it.adviceId === a.adviceId ? { ...it, status: a.status } : it));
                      setError('Failed to dismiss advice');
                    }
                  }}
                  style={{ padding: '0.35rem 0.7rem', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: 4 }}
                >Dismiss</button>
              </div>
            )}
            {a.status === 'Dismissed' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', opacity: 0.6 }}>
                Dismissed {a.dismissedAt ? `at ${new Date(a.dismissedAt).toLocaleString()}` : ''}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdviceList;
