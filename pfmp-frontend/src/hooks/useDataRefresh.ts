import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDataRefreshOptions {
  /** Callback to fetch fresh data */
  refreshFn: () => Promise<void>;
  /** Auto-refresh interval in milliseconds (default: 5 minutes) */
  intervalMs?: number;
  /** Whether to enable auto-refresh (default: false) */
  autoRefresh?: boolean;
  /** Whether to refresh on window focus (default: true) */
  refreshOnFocus?: boolean;
  /** Whether data is currently loading (used to track initial load) */
  isLoading?: boolean;
  /** Key for localStorage persistence (optional) */
  storageKey?: string;
}

export interface UseDataRefreshResult {
  /** Timestamp of last successful refresh */
  lastRefreshed: Date | null;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Error from last refresh attempt */
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Time since last refresh in human-readable format */
  timeSinceRefresh: string;
}

/**
 * Hook for managing data refresh with auto-refresh, manual refresh, and timestamp tracking
 * 
 * TODO: Wire up user-configurable settings for:
 * - autoRefresh toggle
 * - intervalMs (refresh interval)
 * - refreshOnFocus toggle
 * These should be loaded from the settings page once implemented.
 * 
 * @example
 * ```tsx
 * const { lastRefreshed, isRefreshing, refresh, timeSinceRefresh } = useDataRefresh({
 *   refreshFn: async () => {
 *     await refetch();
 *   },
 *   autoRefresh: true,
 *   intervalMs: 5 * 60 * 1000, // 5 minutes
 *   isLoading: loading, // Pass loading state to track initial load
 *   storageKey: 'dashboard-last-refresh', // Persist across page reloads
 * });
 * ```
 */
export function useDataRefresh(options: UseDataRefreshOptions): UseDataRefreshResult {
  const {
    refreshFn,
    intervalMs = 5 * 60 * 1000, // 5 minutes default
    autoRefresh = false,
    refreshOnFocus = true,
    isLoading = false,
    storageKey,
  } = options;

  // Initialize lastRefreshed from localStorage if available
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return new Date(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeSinceRefresh, setTimeSinceRefresh] = useState<string>('Never');
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  const hasSetInitialTimestamp = useRef(false);

  // Helper to update and persist timestamp
  const updateLastRefreshed = useCallback((date: Date) => {
    setLastRefreshed(date);
    if (storageKey) {
      localStorage.setItem(storageKey, date.toISOString());
    }
  }, [storageKey]);

  // Track when initial data load completes (loading changes from true to false)
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    // When loading transitions from true to false, set the initial timestamp
    if (prevLoadingRef.current && !isLoading && !hasSetInitialTimestamp.current) {
      hasSetInitialTimestamp.current = true;
      updateLastRefreshed(new Date());
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, updateLastRefreshed]);

  // Calculate human-readable time since last refresh
  const updateTimeSinceRefresh = useCallback(() => {
    if (!lastRefreshed) {
      setTimeSinceRefresh('Never');
      return;
    }

    const seconds = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
    
    if (seconds < 60) {
      setTimeSinceRefresh('Just now');
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      setTimeSinceRefresh(`${minutes}m ago`);
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      setTimeSinceRefresh(`${hours}h ago`);
    } else {
      const days = Math.floor(seconds / 86400);
      setTimeSinceRefresh(`${days}d ago`);
    }
  }, [lastRefreshed]);

  // Update time display every 30 seconds
  useEffect(() => {
    updateTimeSinceRefresh();
    const timer = setInterval(updateTimeSinceRefresh, 30000);
    return () => clearInterval(timer);
  }, [updateTimeSinceRefresh]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setError(null);

    try {
      await refreshFn();
      updateLastRefreshed(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed');
      setError(error);
      console.error('Data refresh error:', error);
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [refreshFn, updateLastRefreshed]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, intervalMs, refresh]);

  // Refresh on window focus
  useEffect(() => {
    if (!refreshOnFocus) {
      return;
    }

    const handleFocus = () => {
      // Only refresh if data is stale (older than 1 minute)
      if (lastRefreshed && Date.now() - lastRefreshed.getTime() > 60000) {
        refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshOnFocus, refresh, lastRefreshed]);

  return {
    lastRefreshed,
    isRefreshing,
    error,
    refresh,
    timeSinceRefresh,
  };
}
