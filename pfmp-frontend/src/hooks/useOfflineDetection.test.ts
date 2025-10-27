import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineDetection } from './useOfflineDetection';

describe('useOfflineDetection', () => {
  let onlineGetter: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
    onlineGetter.mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    onlineGetter.mockRestore();
    vi.useRealTimers();
  });

  it('returns isOffline=false when online', () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('returns isOffline=true when offline initially', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current.isOffline).toBe(true);
  });

  it('detects going offline', () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current.isOffline).toBe(false);
    
    // Simulate going offline
    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOffline).toBe(true);
  });

  it('detects coming back online', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current.isOffline).toBe(true);
    
    // Simulate coming back online
    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('clears wasOffline flag after 5 seconds', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOfflineDetection());
    
    // Go online
    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current.wasOffline).toBe(true);
    
    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(result.current.wasOffline).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOfflineDetection());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
