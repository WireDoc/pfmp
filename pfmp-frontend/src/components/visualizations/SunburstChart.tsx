/**
 * D3 Sunburst Chart Component
 * 
 * Interactive donut/sunburst chart for portfolio allocation visualization.
 * Features:
 * - Smooth transitions and hover effects
 * - Click to zoom and highlight segments
 * - Responsive design
 * - Custom tooltips with value and percentage
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import * as d3 from 'd3';
import { useD3 } from '../../hooks/useD3';
import type { AllocationItem, AllocationDimension } from '../../api/portfolioAnalytics';

interface SunburstChartProps {
  allocations: AllocationItem[];
  dimension: AllocationDimension;
  loading?: boolean;
  height?: number;
}

// Color palette - professional financial colors
const COLORS = [
  '#1976d2', // blue
  '#388e3c', // green
  '#f57c00', // orange
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0097a7', // cyan
  '#c2185b', // pink
  '#5d4037', // brown
  '#455a64', // blue-grey
  '#fbc02d', // yellow
  '#e91e63', // deep pink
  '#00bcd4', // light cyan
];

// Get dimension display label
const getDimensionLabel = (dimension: AllocationDimension): string => {
  switch (dimension) {
    case 'assetClass':
      return 'Asset Class';
    case 'sector':
      return 'Sector';
    case 'geography':
      return 'Geography';
    case 'marketCap':
      return 'Market Cap';
    default:
      return dimension;
  }
};

// Format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface TooltipData {
  name: string;
  value: number;
  percent: number;
  x: number;
  y: number;
}

export const SunburstChart: React.FC<SunburstChartProps> = ({
  allocations,
  dimension,
  loading = false,
  height = 400,
}) => {
  const theme = useTheme();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Prepare data for D3
  const chartData = useMemo(() => {
    if (!allocations || allocations.length === 0) return [];
    
    return allocations
      .map((item, index) => ({
        name: item.category,
        value: item.value,
        percent: item.percent,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [allocations]);

  // Total value for center display
  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // D3 rendering function
  const renderChart = useCallback(
    (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
      // Clear previous content
      svg.selectAll('*').remove();

      if (chartData.length === 0) return;

      // Get dimensions
      const svgNode = svg.node();
      if (!svgNode) return;
      
      const width = svgNode.clientWidth || 400;
      const chartHeight = height - 50; // Leave room for legend
      const radius = Math.min(width, chartHeight) / 2 - 10;
      const innerRadius = radius * 0.5; // Donut style
      const outerRadius = radius;

      // Create group centered in SVG
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${chartHeight / 2})`);

      // Create pie generator
      const pie = d3
        .pie<(typeof chartData)[0]>()
        .value((d) => d.value)
        .sort(null) // Keep original sort order
        .padAngle(0.02); // Small gap between segments

      // Create arc generator
      const arc = d3
        .arc<d3.PieArcDatum<(typeof chartData)[0]>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(4);

      // Arc for hover effect (slightly larger)
      const arcHover = d3
        .arc<d3.PieArcDatum<(typeof chartData)[0]>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + 8)
        .cornerRadius(4);

      // Generate pie data
      const pieData = pie(chartData);

      // Draw segments
      const segments = g
        .selectAll<SVGPathElement, d3.PieArcDatum<(typeof chartData)[0]>>('path')
        .data(pieData)
        .join('path')
        .attr('d', arc)
        .attr('fill', (d) => d.data.color)
        .attr('stroke', theme.palette.background.paper)
        .attr('stroke-width', 2)
        .attr('opacity', (d) =>
          selectedSegment === null || selectedSegment === d.data.name ? 1 : 0.4
        )
        .style('cursor', 'pointer')
        .on('mouseenter', function (event, d) {
          // Expand on hover
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arcHover as any);

          // Get position for tooltip
          const [x, y] = arc.centroid(d);
          const svgRect = svgNode.getBoundingClientRect();
          
          setTooltip({
            name: d.data.name,
            value: d.data.value,
            percent: d.data.percent,
            x: svgRect.left + width / 2 + x,
            y: svgRect.top + chartHeight / 2 + y,
          });
        })
        .on('mouseleave', function () {
          // Shrink back
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arc as any);

          setTooltip(null);
        })
        .on('click', function (event, d) {
          // Toggle selection
          setSelectedSegment((prev) =>
            prev === d.data.name ? null : d.data.name
          );
        });

      // Initial animation - grow from center
      segments
        .attr('d', (d) =>
          d3
            .arc<d3.PieArcDatum<(typeof chartData)[0]>>()
            .innerRadius(0)
            .outerRadius(0)
            .cornerRadius(4)(d)
        )
        .transition()
        .duration(800)
        .delay((_, i) => i * 50)
        .attrTween('d', function (d) {
          const interpolateInner = d3.interpolate(0, innerRadius);
          const interpolateOuter = d3.interpolate(0, outerRadius);
          return (t) =>
            d3
              .arc<d3.PieArcDatum<(typeof chartData)[0]>>()
              .innerRadius(interpolateInner(t))
              .outerRadius(interpolateOuter(t))
              .cornerRadius(4)(d) || '';
        });

      // Center text - Total value
      const centerGroup = g.append('g').attr('class', 'center-text');

      centerGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('font-size', '14px')
        .attr('fill', theme.palette.text.secondary)
        .text('Total Value');

      centerGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('font-size', '20px')
        .attr('font-weight', 'bold')
        .attr('fill', theme.palette.text.primary)
        .text(formatCurrency(totalValue));

      // Legend below chart
      const legendY = chartHeight / 2 + radius + 20;
      const legendGroup = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(10, ${legendY})`);

      const legendItems = legendGroup
        .selectAll<SVGGElement, (typeof chartData)[0]>('g')
        .data(chartData.slice(0, 6)) // Show top 6 in legend
        .join('g')
        .attr('transform', (_, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return `translate(${col * (width / 3)}, ${row * 20})`;
        });

      legendItems
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', (d) => d.color);

      legendItems
        .append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('font-size', '11px')
        .attr('fill', theme.palette.text.secondary)
        .text((d) => `${d.name} (${formatPercent(d.percent)})`);
    },
    [chartData, height, selectedSegment, theme, totalValue]
  );

  // Use D3 hook
  const svgRef = useD3(renderChart, [renderChart]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, minHeight: height }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (!allocations || allocations.length === 0) {
    return (
      <Paper sx={{ p: 2, minHeight: height }}>
        <Typography variant="h6" gutterBottom>
          Allocation by {getDimensionLabel(dimension)}
        </Typography>
        <Typography color="text.secondary">
          No allocation data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Allocation by {getDimensionLabel(dimension)}
      </Typography>

      <Box sx={{ width: '100%', height }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%' }}
          aria-label={`Allocation chart by ${getDimensionLabel(dimension)}`}
        />
      </Box>

      {/* Custom Tooltip */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
            bgcolor: 'background.paper',
            boxShadow: 4,
            borderRadius: 1,
            p: 1.5,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {tooltip.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(tooltip.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPercent(tooltip.percent)}
          </Typography>
        </Box>
      )}

      {/* Selected segment details */}
      {selectedSegment && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: 'primary.lighter',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2">
            Selected: {selectedSegment}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(
              chartData.find((d) => d.name === selectedSegment)?.value ?? 0
            )}{' '}
            (
            {formatPercent(
              chartData.find((d) => d.name === selectedSegment)?.percent ?? 0
            )}
            )
          </Typography>
        </Box>
      )}

      {/* Tip */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="info.dark">
          <strong>Tip:</strong> Click on a segment to highlight it. Hover for
          details.
        </Typography>
      </Box>
    </Paper>
  );
};
