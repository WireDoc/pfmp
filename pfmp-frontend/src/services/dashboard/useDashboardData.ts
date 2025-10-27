import { useEffect, useState, useCallback, useRef } from 'react';
import { getDashboardService } from './index';
import type { DashboardData, LongTermObligationSummary } from './types';

interface State {
  data: DashboardData | null;
  loading: boolean;
  error: unknown;
}

interface UseDashboardDataResult extends State {
  refetch: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const latestObligationsRef = useRef<LongTermObligationSummary | undefined>(undefined);

  const loadData = useCallback(async () => {
    const service = getDashboardService();
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const d = await service.load();
      const dataWithLatest = latestObligationsRef.current !== undefined
        ? { ...d, longTermObligations: latestObligationsRef.current }
        : d;
      setState({ data: dataWithLatest, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e });
    }
  }, []);

  const applyObligations = useCallback((summary: LongTermObligationSummary | undefined) => {
    latestObligationsRef.current = summary;
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    const service = getDashboardService();
    let unsubscribe: (() => void) | null = null;

    // Initial load
    loadData();

    // Subscribe to long-term obligations updates
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
  }, [loadData, applyObligations]);

  return {
    ...state,
    refetch: loadData,
  };
}
