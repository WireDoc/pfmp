import { useEffect, useState } from 'react';
import { getDashboardService } from './index';
import type { DashboardData } from './types';

interface State {
  data: DashboardData | null;
  loading: boolean;
  error: unknown;
}

export function useDashboardData() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    getDashboardService().load()
      .then(d => { if (!cancelled) setState({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setState({ data: null, loading: false, error: e }); });
    return () => { cancelled = true; };
  }, []);

  return state;
}
