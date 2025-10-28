import { useEffect, useRef } from 'react';

/**
 * Hook to measure and log performance metrics for dashboard components
 * 
 * @param componentName - Name of the component being measured
 * @param dependencies - Array of dependencies to trigger re-measurement
 * 
 * @example
 * usePerformanceMetric('DashboardWave4', [data, loading]);
 */
export function usePerformanceMetric(
  componentName: string,
  dependencies: unknown[] = []
): void {
  const mountTimeRef = useRef<number>(performance.now());
  const hasMeasuredRef = useRef<boolean>(false);

  useEffect(() => {
    // Only measure in development mode
    if (import.meta.env.PROD) return;

    const mountTime = mountTimeRef.current;
    const renderTime = performance.now();
    const duration = renderTime - mountTime;

    if (!hasMeasuredRef.current) {
      console.log(
        `[Performance] ${componentName} initial render: ${duration.toFixed(2)}ms`
      );
      hasMeasuredRef.current = true;
    } else {
      console.log(
        `[Performance] ${componentName} re-render: ${duration.toFixed(2)}ms`
      );
    }

    // Reset mount time for next render
    mountTimeRef.current = performance.now();
  }, dependencies);
}

/**
 * Mark a performance event with a timestamp
 * 
 * @param markName - Name of the performance mark
 * 
 * @example
 * performanceMark('dashboard-data-loaded');
 */
export function performanceMark(markName: string): void {
  if (import.meta.env.PROD) return;
  
  performance.mark(markName);
  console.log(`[Performance Mark] ${markName} at ${performance.now().toFixed(2)}ms`);
}

/**
 * Measure time between two performance marks
 * 
 * @param measureName - Name for this measurement
 * @param startMark - Name of the start mark
 * @param endMark - Name of the end mark
 * @returns Duration in milliseconds, or null if measurement failed
 * 
 * @example
 * performanceMark('dashboard-start');
 * // ... some operations ...
 * performanceMark('dashboard-end');
 * performanceMeasure('dashboard-total', 'dashboard-start', 'dashboard-end');
 */
export function performanceMeasure(
  measureName: string,
  startMark: string,
  endMark: string
): number | null {
  if (import.meta.env.PROD) return null;

  try {
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName, 'measure')[0] as PerformanceMeasure;
    const duration = measure.duration;
    
    console.log(`[Performance Measure] ${measureName}: ${duration.toFixed(2)}ms`);
    return duration;
  } catch (error) {
    console.warn(`[Performance] Failed to measure ${measureName}:`, error);
    return null;
  }
}

/**
 * Clear all performance marks and measures
 */
export function clearPerformanceMetrics(): void {
  if (import.meta.env.PROD) return;
  
  performance.clearMarks();
  performance.clearMeasures();
  console.log('[Performance] Cleared all marks and measures');
}

/**
 * Get all performance entries of a specific type
 * 
 * @param entryType - Type of entries to retrieve ('mark', 'measure', 'resource', etc.)
 * @returns Array of performance entries
 */
export function getPerformanceEntries(entryType: string): PerformanceEntry[] {
  return performance.getEntriesByType(entryType);
}

/**
 * Log a summary of all performance marks and measures
 */
export function logPerformanceSummary(): void {
  if (import.meta.env.PROD) return;

  console.group('[Performance Summary]');
  
  const marks = performance.getEntriesByType('mark');
  if (marks.length > 0) {
    console.log('Marks:');
    marks.forEach(mark => {
      console.log(`  - ${mark.name}: ${mark.startTime.toFixed(2)}ms`);
    });
  }

  const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
  if (measures.length > 0) {
    console.log('Measures:');
    measures.forEach(measure => {
      console.log(`  - ${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });
  }

  console.groupEnd();
}
