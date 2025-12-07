import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

type D3Selection = d3.Selection<SVGSVGElement, unknown, null, undefined>;

/**
 * Hook for integrating D3.js with React components.
 * Provides a ref to attach to an SVG element and calls the render function
 * when dependencies change.
 * 
 * @param renderFn - D3 rendering function that receives the SVG selection
 * @param dependencies - React dependency array to trigger re-renders
 * @returns Ref to attach to an SVG element
 * 
 * @example
 * ```tsx
 * const svgRef = useD3((svg) => {
 *   svg.selectAll('circle')
 *     .data(data)
 *     .join('circle')
 *     .attr('r', d => d.value);
 * }, [data]);
 * 
 * return <svg ref={svgRef} />;
 * ```
 */
export function useD3(
  renderFn: (svg: D3Selection) => void | (() => void),
  dependencies: React.DependencyList
) {
  const ref = useRef<SVGSVGElement>(null);
  
  // Memoize the render function to avoid unnecessary re-renders
  const stableRenderFn = useCallback(renderFn, dependencies);

  useEffect(() => {
    if (!ref.current) return;
    
    const svg = d3.select(ref.current);
    
    // Call render function and capture cleanup if returned
    const cleanup = stableRenderFn(svg);
    
    // Return cleanup function if provided
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [stableRenderFn]);

  return ref;
}

/**
 * Type-safe helper to create a D3 transition with proper TypeScript support
 */
export function createTransition<T extends d3.BaseType>(
  selection: d3.Selection<T, unknown, null, undefined>,
  duration = 750
) {
  return selection.transition().duration(duration);
}

/**
 * Format a number as currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
