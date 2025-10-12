import { useEffect, useState } from 'react';
import { getDashboardService } from './index';
import type { DashboardData, LongTermObligationSummary } from './types';

interface State {
  data: DashboardData | null;
  loading: boolean;
  error: unknown;
}

export function useDashboardData() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    const service = getDashboardService();
    let unsubscribe: (() => void) | null = null;
    let latestObligations: LongTermObligationSummary | undefined;

    const applyObligations = (summary: LongTermObligationSummary | undefined) => {
      latestObligations = summary;
      setState(prev => {
        if (!prev.data) {
          return prev;
        }
        const nextData: DashboardData = {
          ...prev.data,
          longTermObligations: summary,
        };
        return { ...prev, data: nextData };
      });
    };

    setState(s => ({ ...s, loading: true, error: null }));
    service.load()
      .then(d => {
        if (cancelled) {
          return;
        }
        const dataWithLatest = latestObligations !== undefined
          ? { ...d, longTermObligations: latestObligations }
          : d;
        setState({ data: dataWithLatest, loading: false, error: null });
      })
      .catch(e => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: e });
        }
      });

    if (service.subscribeToLongTermObligations) {
      unsubscribe = service.subscribeToLongTermObligations((summary) => {
        if (!cancelled) {
          applyObligations(summary);
        }
      });
    }

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return state;
}
