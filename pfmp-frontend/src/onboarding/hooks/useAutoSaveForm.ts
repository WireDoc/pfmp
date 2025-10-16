import { useCallback, useEffect, useRef, useState } from 'react';
import type { FinancialProfileSectionStatusValue } from '../../services/financialProfileApi';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveFormOptions<T> {
  data: T;
  persist: (payload: T) => Promise<FinancialProfileSectionStatusValue | void>;
  enabled?: boolean;
  debounceMs?: number;
  determineStatus?: (payload: T) => FinancialProfileSectionStatusValue | undefined;
  onStatusResolved?: (status: FinancialProfileSectionStatusValue) => void;
  onPersistSuccess?: (payload: T) => void;
  onPersistError?: (error: unknown) => void;
  autoResetDelayMs?: number;
}

export interface UseAutoSaveFormReturn<T> {
  status: AutoSaveStatus;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  error: unknown;
  flush: () => Promise<void>;
  cancel: () => void;
  resetBaseline: (nextData?: T) => void;
}

export function useAutoSaveForm<T>({
  data,
  persist,
  enabled = true,
  debounceMs = 800,
  determineStatus,
  onStatusResolved,
  onPersistSuccess,
  onPersistError,
  autoResetDelayMs = 2400,
}: UseAutoSaveFormOptions<T>): UseAutoSaveFormReturn<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const isFlushingRef = useRef(false);
  const pendingRef = useRef<{ serialized: string; payload: T } | null>(null);

  const latestDataRef = useRef<T>(data);
  const currentSerializedRef = useRef<string>(JSON.stringify(data));
  const lastSavedSerializedRef = useRef<string>(currentSerializedRef.current);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'saved') return;
    if (autoResetDelayMs <= 0) return;

    const handle = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setStatus('idle');
    }, autoResetDelayMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [status, autoResetDelayMs]);

  const executeSave = useCallback(
    async function run(serialized: string, payload: T): Promise<void> {
      if (!enabled) return;

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (isFlushingRef.current) {
        pendingRef.current = { serialized, payload };
        return;
      }

      isFlushingRef.current = true;
      setStatus('saving');
      setError(null);

      try {
        const result = await persist(payload);
        const resolvedStatus = result ?? determineStatus?.(payload);

        if (!mountedRef.current) return;

        lastSavedSerializedRef.current = serialized;
        setStatus('saved');
        setLastSavedAt(new Date().toISOString());
        if (resolvedStatus) {
          onStatusResolved?.(resolvedStatus);
        }
        onPersistSuccess?.(payload);
      } catch (err) {
        if (!mountedRef.current) return;
        setStatus('error');
        setError(err);
        onPersistError?.(err);
      } finally {
        isFlushingRef.current = false;
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        const pending = pendingRef.current;
        if (pending) {
          pendingRef.current = null;
          void Promise.resolve().then(() => run(pending.serialized, pending.payload));
        }
      }
    },
    [determineStatus, enabled, onPersistError, onPersistSuccess, onStatusResolved, persist],
  );

  useEffect(() => {
    latestDataRef.current = data;
    const serialized = JSON.stringify(data);
    currentSerializedRef.current = serialized;

    if (!enabled) return;

    if (serialized === lastSavedSerializedRef.current) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (status === 'error') {
        setStatus('idle');
        setError(null);
      }
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void executeSave(serialized, latestDataRef.current);
    }, debounceMs);
  }, [data, debounceMs, enabled, executeSave, status]);

  useEffect(() => {
    if (enabled) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [enabled]);

  const flush = useCallback(async () => {
    if (!enabled) return;
    const serialized = currentSerializedRef.current;

    if (serialized === lastSavedSerializedRef.current) {
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await executeSave(serialized, latestDataRef.current);
  }, [enabled, executeSave]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  const resetBaseline = useCallback(
    (nextData?: T) => {
      const payload = nextData ?? latestDataRef.current;
      const serialized = JSON.stringify(payload);
      latestDataRef.current = payload;
      currentSerializedRef.current = serialized;
      lastSavedSerializedRef.current = serialized;
      pendingRef.current = null;
      setStatus('idle');
      setError(null);
    },
    [],
  );

  const isDirty = currentSerializedRef.current !== lastSavedSerializedRef.current;

  return {
    status,
    isSaving: status === 'saving',
    isDirty,
    lastSavedAt,
    error,
    flush,
    cancel,
    resetBaseline,
  };
}
