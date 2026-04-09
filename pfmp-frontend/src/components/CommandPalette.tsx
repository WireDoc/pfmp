import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as AccountsIcon,
  Lightbulb as InsightsIcon,
  Checklist as TasksIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Search as SearchIcon,
  TrendingUp as TspIcon,
  Timeline as NetWorthIcon,
  CreditScore as DebtIcon,
  AdminPanelSettings as AdminIcon,
  Link as ConnectionsIcon,
  AutoAwesome as AnalysisIcon,
  MonetizationOn as ExpensesIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';

interface PaletteCommand {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ReactElement;
  category: 'navigate' | 'action';
  keywords: string[];
}

const COMMANDS: PaletteCommand[] = [
  // Navigation commands
  { id: 'nav-dashboard', label: 'Dashboard', description: 'Go to main dashboard', path: '/dashboard', icon: <DashboardIcon />, category: 'navigate', keywords: ['home', 'overview', 'main'] },
  { id: 'nav-accounts', label: 'Accounts', description: 'View all accounts', path: '/dashboard/accounts', icon: <AccountsIcon />, category: 'navigate', keywords: ['bank', 'investment', 'balance', 'cash'] },
  { id: 'nav-insights', label: 'Insights', description: 'AI analysis and insights', path: '/dashboard/insights', icon: <InsightsIcon />, category: 'navigate', keywords: ['ai', 'analysis', 'advice', 'recommendations'] },
  { id: 'nav-actions', label: 'Actions', description: 'Alerts, advice, and tasks', path: '/dashboard/actions', icon: <TasksIcon />, category: 'navigate', keywords: ['alerts', 'tasks', 'todo', 'advice'] },
  { id: 'nav-profile', label: 'Profile', description: 'Edit your financial profile', path: '/dashboard/profile', icon: <ProfileIcon />, category: 'navigate', keywords: ['household', 'income', 'expenses', 'edit'] },
  { id: 'nav-settings', label: 'Settings', description: 'Notifications and preferences', path: '/dashboard/settings', icon: <SettingsIcon />, category: 'navigate', keywords: ['notifications', 'preferences', 'config'] },
  { id: 'nav-help', label: 'Help', description: 'FAQ, guides, and shortcuts', path: '/dashboard/help', icon: <HelpIcon />, category: 'navigate', keywords: ['faq', 'guide', 'support', 'docs'] },
  { id: 'nav-tsp', label: 'Thrift Savings Plan', description: 'TSP account details', path: '/dashboard/tsp', icon: <TspIcon />, category: 'navigate', keywords: ['tsp', 'retirement', 'federal', 'contributions'] },
  { id: 'nav-net-worth', label: 'Net Worth Timeline', description: 'Track net worth over time', path: '/dashboard/net-worth', icon: <NetWorthIcon />, category: 'navigate', keywords: ['timeline', 'history', 'chart', 'worth'] },
  { id: 'nav-debt-payoff', label: 'Debt Payoff', description: 'Debt payoff strategies', path: '/dashboard/debt-payoff', icon: <DebtIcon />, category: 'navigate', keywords: ['debt', 'payoff', 'loan', 'credit', 'strategy'] },
  { id: 'nav-connections', label: 'Connected Accounts', description: 'Manage Plaid connections', path: '/dashboard/settings/connections', icon: <ConnectionsIcon />, category: 'navigate', keywords: ['plaid', 'link', 'bank', 'connection', 'sync'] },
  { id: 'nav-admin', label: 'Scheduler Admin', description: 'Background job management', path: '/dashboard/admin/scheduler', icon: <AdminIcon />, category: 'navigate', keywords: ['admin', 'scheduler', 'jobs', 'background'] },

  // Quick action commands
  { id: 'act-analysis', label: 'Run AI Analysis', description: 'Navigate to insights and run analysis', path: '/dashboard/insights', icon: <AnalysisIcon />, category: 'action', keywords: ['run', 'analyze', 'ai', 'generate'] },
  { id: 'act-add-account', label: 'Add Account', description: 'Go to accounts to add a new one', path: '/dashboard/accounts', icon: <AccountsIcon />, category: 'action', keywords: ['add', 'new', 'create', 'account'] },
  { id: 'act-expenses', label: 'View Expenses', description: 'Open expense budget in profile', path: '/dashboard/profile?tab=expenses', icon: <ExpensesIcon />, category: 'action', keywords: ['expenses', 'budget', 'spending'] },
  { id: 'act-tsp', label: 'Update TSP', description: 'View and update TSP contributions', path: '/dashboard/tsp', icon: <TspIcon />, category: 'action', keywords: ['update', 'tsp', 'contributions'] },
  { id: 'act-health', label: 'View Health Score', description: 'Check your financial health score', path: '/dashboard', icon: <HealthIcon />, category: 'action', keywords: ['health', 'score', 'financial', 'grade'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Close palette on route change
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [location.pathname]);

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const lower = query.toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower) ||
      cmd.keywords.some(kw => kw.includes(lower))
    );
  }, [query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleSelect = (cmd: PaletteCommand) => {
    setOpen(false);
    setQuery('');
    navigate(cmd.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  // Group by category
  const navCommands = filtered.filter(c => c.category === 'navigate');
  const actionCommands = filtered.filter(c => c.category === 'action');

  return (
    <Dialog
      open={open}
      onClose={() => { setOpen(false); setQuery(''); }}
      maxWidth="sm"
      fullWidth
      data-testid="command-palette"
      slotProps={{
        paper: {
          sx: {
            position: 'fixed',
            top: '15%',
            m: 0,
            borderRadius: 2,
            maxHeight: '60vh',
          },
        },
      }}
    >
      <Box sx={{ p: 0 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Type a command or search..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="Esc" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                </InputAdornment>
              ),
              'aria-label': 'Command palette search',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' },
            },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        />

        {filtered.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No results for &quot;{query}&quot;</Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: '45vh', overflow: 'auto', py: 0.5 }}>
            {navCommands.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
                  Navigation
                </Typography>
                {navCommands.map(cmd => {
                  const globalIdx = filtered.indexOf(cmd);
                  return (
                    <ListItemButton
                      key={cmd.id}
                      selected={globalIdx === selectedIndex}
                      onClick={() => handleSelect(cmd)}
                      sx={{ px: 2, py: 0.75 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{cmd.icon}</ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        slotProps={{
                          primary: { variant: 'body2', fontWeight: 500 },
                          secondary: { variant: 'caption' },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </>
            )}

            {actionCommands.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
                  Actions
                </Typography>
                {actionCommands.map(cmd => {
                  const globalIdx = filtered.indexOf(cmd);
                  return (
                    <ListItemButton
                      key={cmd.id}
                      selected={globalIdx === selectedIndex}
                      onClick={() => handleSelect(cmd)}
                      sx={{ px: 2, py: 0.75 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{cmd.icon}</ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        slotProps={{
                          primary: { variant: 'body2', fontWeight: 500 },
                          secondary: { variant: 'caption' },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </>
            )}
          </List>
        )}
      </Box>
    </Dialog>
  );
}
