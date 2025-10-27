import { useState, useEffect } from 'react';

interface UseOfflineDetectionResult {
  /**
   * Whether the browser is currently offline
   */
  isOffline: boolean;
  /**
   * Whether the user was recently offline (useful for showing "back online" messages)
   */
  wasOffline: boolean;
}

/**
 * useOfflineDetection - Detects when the browser goes offline/online
 * 
 * Uses navigator.onLine and online/offline events to track network status.
 * Returns current offline state and tracks if user was recently offline.
 */
export function useOfflineDetection(): UseOfflineDetectionResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setWasOffline(true);
      
      // Clear "was offline" flag after 5 seconds
      setTimeout(() => {
        setWasOffline(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, wasOffline };
}
