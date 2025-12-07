/**
 * D3 Correlation Heatmap Component
 * 
 * Interactive heatmap visualization for portfolio holding correlations.
 * Features:
 * - Color-coded correlation values (red = negative, green = positive)
 * - Hover tooltips with correlation interpretation
 * - Click to highlight row/column
 * - Responsive design
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import type { CorrelationPair } from '../../api/portfolioAnalytics';

interface CorrelationHeatmapProps {
  correlationMatrix: CorrelationPair[];
  loading?: boolean;
}

interface TooltipData {
  symbol1: string;
  symbol2: string;
  correlation: number;
  x: number;
  y: number;
}

// Interpret correlation value
const getCorrelationInterpretation = (value: number): string => {
  const abs = Math.abs(value);
  const direction = value >= 0 ? 'positive' : 'negative';
  
  if (abs >= 0.9) return `Very strong ${direction}`;
  if (abs >= 0.7) return `Strong ${direction}`;
  if (abs >= 0.5) return `Moderate ${direction}`;
  if (abs >= 0.3) return `Weak ${direction}`;
  if (abs >= 0.1) return `Very weak ${direction}`;
  return 'No correlation';
};

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  correlationMatrix,
  loading = false,
}) => {
  const theme = useTheme();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | null>(null);

  // Process correlation data into matrix format
  const { symbols, matrix } = useMemo(() => {
    if (!correlationMatrix || correlationMatrix.length === 0) {
      return { symbols: [], matrix: {} as Record<string, Record<string, number>> };
    }

    // Collect unique symbols
    const symbolSet = new Set<string>();
    correlationMatrix.forEach((pair) => {
      symbolSet.add(pair.symbol1);
      symbolSet.add(pair.symbol2);
    });
    const sortedSymbols = Array.from(symbolSet).sort();

    // Build symmetric matrix
    const matrixData: Record<string, Record<string, number>> = {};
    sortedSymbols.forEach((s1) => {
      matrixData[s1] = {};
      sortedSymbols.forEach((s2) => {
        matrixData[s1][s2] = s1 === s2 ? 1.0 : 0;
      });
    });

    // Fill in values
    correlationMatrix.forEach((pair) => {
      matrixData[pair.symbol1][pair.symbol2] = pair.correlation;
      matrixData[pair.symbol2][pair.symbol1] = pair.correlation;
    });

    return { symbols: sortedSymbols, matrix: matrixData };
  }, [correlationMatrix]);

  // D3 rendering function
  const renderChart = useCallback(
    (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
      svg.selectAll('*').remove();

      if (symbols.length === 0) return;

      const svgNode = svg.node();
      if (!svgNode) return;

      const width = svgNode.clientWidth || 800;
      const margin = { top: 80, right: 20, bottom: 60, left: 80 };
      const chartWidth = width - margin.left - margin.right;

      // Calculate cell dimensions - rectangular like the table view
      const cellWidth = chartWidth / symbols.length;
      const cellHeight = 40; // Fixed row height like table rows
      
      const actualWidth = cellWidth * symbols.length;
      const actualHeight = cellHeight * symbols.length;
      
      // Calculate total SVG height dynamically
      const totalHeight = margin.top + actualHeight + margin.bottom;
      svg.attr('height', totalHeight);

      // Center the heatmap horizontally
      const offsetX = 0;
      const offsetY = 0;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left + offsetX}, ${margin.top + offsetY})`);

      // Color scale: red (negative) -> white (zero) -> green (positive)
      const colorScale = d3
        .scaleLinear<string>()
        .domain([-1, 0, 1])
        .range(['#d32f2f', '#ffffff', '#388e3c']);

      // Create cells
      symbols.forEach((rowSymbol, rowIdx) => {
        symbols.forEach((colSymbol, colIdx) => {
          const value = matrix[rowSymbol]?.[colSymbol] ?? 0;
          const isDiagonal = rowSymbol === colSymbol;
          const isHighlighted =
            highlightedSymbol === null ||
            highlightedSymbol === rowSymbol ||
            highlightedSymbol === colSymbol;

          const cell = g
            .append('rect')
            .attr('x', colIdx * cellWidth)
            .attr('y', rowIdx * cellHeight)
            .attr('width', cellWidth - 2)
            .attr('height', cellHeight - 2)
            .attr('rx', 3)
            .attr('fill', colorScale(value))
            .attr('stroke', isDiagonal ? theme.palette.primary.main : '#e0e0e0')
            .attr('stroke-width', isDiagonal ? 2 : 1)
            .attr('opacity', isHighlighted ? 1 : 0.3)
            .style('cursor', 'pointer');

          // Hover effects
          cell
            .on('mouseenter', function (event) {
              d3.select(this)
                .attr('stroke', theme.palette.primary.main)
                .attr('stroke-width', 2);

              const svgRect = svgNode.getBoundingClientRect();
              setTooltip({
                symbol1: rowSymbol,
                symbol2: colSymbol,
                correlation: value,
                x: svgRect.left + margin.left + offsetX + colIdx * cellWidth + cellWidth / 2,
                y: svgRect.top + margin.top + offsetY + rowIdx * cellHeight,
              });
            })
            .on('mouseleave', function () {
              d3.select(this)
                .attr('stroke', isDiagonal ? theme.palette.primary.main : '#e0e0e0')
                .attr('stroke-width', isDiagonal ? 2 : 1);
              setTooltip(null);
            })
            .on('click', function () {
              setHighlightedSymbol((prev) =>
                prev === rowSymbol ? null : rowSymbol
              );
            });

          // Value text - always show since cells are wide enough
          g.append('text')
            .attr('x', colIdx * cellWidth + cellWidth / 2)
            .attr('y', rowIdx * cellHeight + cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', isDiagonal ? 'bold' : 'normal')
            .attr('fill', Math.abs(value) > 0.5 ? '#ffffff' : '#000000')
            .attr('pointer-events', 'none')
            .text(value.toFixed(2));
        });
      });

      // X-axis labels (top) - rotated to avoid overlap
      g.selectAll('.x-label')
        .data(symbols)
        .join('text')
        .attr('class', 'x-label')
        .attr('x', (_, i) => i * cellWidth + cellWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'start')
        .attr('transform', (_, i) => `rotate(-50, ${i * cellWidth + cellWidth / 2}, -15)`)
        .attr('font-size', '11px')
        .attr('font-weight', (d) => (d === highlightedSymbol ? 'bold' : 'normal'))
        .attr('fill', (d) =>
          d === highlightedSymbol
            ? theme.palette.primary.main
            : theme.palette.text.secondary
        )
        .style('cursor', 'pointer')
        .text((d) => d)
        .on('click', function (_, d) {
          setHighlightedSymbol((prev) => (prev === d ? null : d));
        });

      // Y-axis labels (left)
      g.selectAll('.y-label')
        .data(symbols)
        .join('text')
        .attr('class', 'y-label')
        .attr('x', -8)
        .attr('y', (_, i) => i * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', (d) => (d === highlightedSymbol ? 'bold' : 'normal'))
        .attr('fill', (d) =>
          d === highlightedSymbol
            ? theme.palette.primary.main
            : theme.palette.text.secondary
        )
        .style('cursor', 'pointer')
        .text((d) => d)
        .on('click', function (_, d) {
          setHighlightedSymbol((prev) => (prev === d ? null : d));
        });

      // Color legend
      const legendWidth = 150;
      const legendHeight = 12;
      const legendX = actualWidth / 2 - legendWidth / 2;
      const legendY = actualHeight + 25;

      // Gradient definition
      const defs = svg.append('defs');
      const gradient = defs
        .append('linearGradient')
        .attr('id', 'correlation-gradient');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#d32f2f');
      gradient
        .append('stop')
        .attr('offset', '50%')
        .attr('stop-color', '#ffffff');
      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#388e3c');

      const legendGroup = g
        .append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      legendGroup
        .append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('rx', 2)
        .attr('fill', 'url(#correlation-gradient)')
        .attr('stroke', '#ccc');

      legendGroup
        .append('text')
        .attr('x', 0)
        .attr('y', legendHeight + 14)
        .attr('font-size', '10px')
        .attr('fill', theme.palette.text.secondary)
        .text('-1.0');

      legendGroup
        .append('text')
        .attr('x', legendWidth / 2)
        .attr('y', legendHeight + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', theme.palette.text.secondary)
        .text('0');

      legendGroup
        .append('text')
        .attr('x', legendWidth)
        .attr('y', legendHeight + 14)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('fill', theme.palette.text.secondary)
        .text('+1.0');
    },
    [symbols, matrix, highlightedSymbol, theme]
  );

  const svgRef = useD3(renderChart, [renderChart]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, minHeight: height }}>
        <Typography variant="h6" gutterBottom>
          Correlation Heatmap
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (!correlationMatrix || correlationMatrix.length === 0) {
    return (
      <Paper sx={{ p: 2, minHeight: height }}>
        <Typography variant="h6" gutterBottom>
          Correlation Heatmap
        </Typography>
        <Typography color="text.secondary">
          No correlation data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Correlation Heatmap
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        How holdings move together (1.0 = same direction, -1.0 = opposite, 0 = independent)
      </Typography>

      <Box sx={{ width: '100%' }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', minHeight: 400 }}
          aria-label="Correlation heatmap"
        />
      </Box>

      {/* Tooltip */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -110%)',
            bgcolor: 'background.paper',
            boxShadow: 4,
            borderRadius: 1,
            p: 1.5,
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: 150,
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {tooltip.symbol1} ↔ {tooltip.symbol2}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Correlation: {tooltip.correlation.toFixed(3)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color:
                tooltip.correlation >= 0.5
                  ? 'success.main'
                  : tooltip.correlation <= -0.5
                  ? 'error.main'
                  : 'text.secondary',
              fontWeight: 'medium',
            }}
          >
            {getCorrelationInterpretation(tooltip.correlation)}
          </Typography>
        </Box>
      )}

      {/* Highlighted symbol info */}
      {highlightedSymbol && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: 'primary.lighter',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2">
            Highlighting: {highlightedSymbol}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click on a different symbol to compare, or click again to clear.
          </Typography>
        </Box>
      )}

      {/* Diversification tip */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Diversification Tip:</strong> Holdings with correlations near
          0 or negative provide the best diversification benefits. High positive
          correlations (green) mean assets move together.
        </Typography>
      </Box>
    </Paper>
  );
};
