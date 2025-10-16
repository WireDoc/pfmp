import { useEffect, useRef } from 'react';

interface UseSectionHydrationOptions<TPayload, TState> {
  sectionKey: string;
  userId: number;
  fetcher: (userId: number) => Promise<TPayload>;
  mapPayloadToState: (payload: TPayload) => TState;
  applyState: (nextState: TState) => TState | void;
  resetBaseline?: (nextState: TState) => void;
  enabled?: boolean;
}

export function useSectionHydration<TPayload, TState>({
  sectionKey,
  userId,
  fetcher,
  mapPayloadToState,
  applyState,
  resetBaseline,
  enabled = true,
}: UseSectionHydrationOptions<TPayload, TState>): void {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function hydrate(): Promise<void> {
      try {
        const payload = await fetcher(userId);
        if (cancelled) return;

        const nextState = mapPayloadToState(payload);
        hydratedRef.current = true;
        const appliedState = applyState(nextState) ?? nextState;
        resetBaseline?.(appliedState);
      } catch (error) {
        if (!cancelled && import.meta.env?.DEV) {
          console.warn(`Failed to hydrate ${sectionKey} section`, error);
        }
      }
    }

    if (!hydratedRef.current) {
      void hydrate();
    }

    return () => {
      cancelled = true;
    };
  }, [applyState, enabled, fetcher, mapPayloadToState, resetBaseline, sectionKey, userId]);
}
