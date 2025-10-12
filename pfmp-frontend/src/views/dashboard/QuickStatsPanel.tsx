import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { DashboardData } from '../../services/dashboard';

interface Props {
  data: DashboardData | null;
  loading: boolean;
}

interface Tile {
  id: string;
  label: string;
  primary: string;
  secondary?: string | null;
  tone: 'primary' | 'success' | 'warning' | 'default';
}

const toneStyles: Record<Tile['tone'], { bg: string; fg: string; border: string }> = {
  primary: { bg: 'rgba(21, 101, 192, 0.12)', fg: '#0d47a1', border: 'rgba(21, 101, 192, 0.2)' },
  success: { bg: 'rgba(46, 125, 50, 0.12)', fg: '#1b5e20', border: 'rgba(46, 125, 50, 0.2)' },
  warning: { bg: 'rgba(245, 124, 0, 0.12)', fg: '#e65100', border: 'rgba(245, 124, 0, 0.24)' },
  default: { bg: 'rgba(84, 110, 122, 0.12)', fg: '#29434e', border: 'rgba(84, 110, 122, 0.2)' },
};

function formatPercent(value: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: Math.abs(value) >= 1 ? 1 : 2,
  });
  return formatter.format(value / 100);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export const QuickStatsPanel: React.FC<Props> = ({ data, loading }) => {
  const tiles = useMemo<Tile[]>(() => {
    if (!data) {
      return [];
    }

    const netWorthChange = data.netWorth.change30dPct ?? null;
    const netWorthCurrency = data.netWorth.netWorth.currency ?? 'USD';
    const netWorthLabel = netWorthChange != null
      ? formatPercent(netWorthChange)
      : formatCurrency(data.netWorth.netWorth.amount, netWorthCurrency);

    const taskCount = data.tasks.filter(task => !['Completed', 'Dismissed'].includes(String(task.status))).length;
    const totalTasks = data.tasks.length;
    const tasksLabel = `${taskCount} outstanding`;
    const tasksSecondary = totalTasks > 0 ? `${totalTasks} total tasks` : 'No active tasks';

    const obligations = data.longTermObligations ?? null;
    let obligationTile: Tile;
    if (!obligations || obligations.count === 0) {
      obligationTile = {
        id: 'obligations',
        label: 'Long-term obligations',
        primary: 'No milestones tracked',
        secondary: 'Add obligations to plan funding timelines.',
        tone: 'default',
      };
    } else {
      const nextDueDate = obligations.nextDueDate ? new Date(obligations.nextDueDate) : null;
      const hasValidDate = nextDueDate && !Number.isNaN(nextDueDate.getTime());
      const dueLabel = hasValidDate
        ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(nextDueDate as Date)
        : 'Date unavailable';
      const daysUntil = hasValidDate
        ? Math.round(((nextDueDate as Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      let tone: Tile['tone'] = 'primary';
      if (typeof daysUntil === 'number') {
        if (daysUntil < 0) tone = 'warning';
        else if (daysUntil <= 14) tone = 'warning';
        else tone = 'primary';
      }

      obligationTile = {
        id: 'obligations',
        label: 'Next milestone',
        primary: dueLabel,
        secondary: `${obligations.count} active · ${formatCurrency(Math.round(obligations.totalEstimate), netWorthCurrency)}`,
        tone,
      };
    }

    const netWorthTile: Tile = {
      id: 'net-worth',
      label: netWorthChange != null ? '30-day net worth change' : 'Current net worth',
      primary: netWorthLabel,
      secondary: netWorthChange != null ? formatCurrency(data.netWorth.netWorth.amount, netWorthCurrency) : null,
      tone: netWorthChange != null && netWorthChange < 0 ? 'warning' : 'success',
    };

    const tasksTile: Tile = {
      id: 'tasks',
      label: 'Tasks & follow-ups',
      primary: tasksLabel,
      secondary: tasksSecondary,
      tone: taskCount > 0 ? 'primary' : 'success',
    };

    return [netWorthTile, tasksTile, obligationTile];
  }, [data]);

  if (loading && !data) {
    return (
      <Box data-testid="quick-stats-panel" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(220px, 1fr))' } }}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(120, 144, 156, 0.2)',
              background: 'rgba(207, 216, 220, 0.2)',
              height: 96,
              animation: 'pfmp-pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
        <style>{`
          @keyframes pfmp-pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box data-testid="quick-stats-panel" sx={{ borderRadius: 3, border: '1px dashed rgba(84, 110, 122, 0.4)', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Metrics will appear here after we load your financial snapshot.
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="quick-stats-panel" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(220px, 1fr))' } }}>
      {tiles.map((tile) => {
        const tone = toneStyles[tile.tone];
        return (
          <Box
            key={tile.id}
            sx={{
              borderRadius: 3,
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.fg,
              p: 2.5,
              minHeight: 96,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
              {tile.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {tile.primary}
            </Typography>
            {tile.secondary && (
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {tile.secondary}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default QuickStatsPanel;
