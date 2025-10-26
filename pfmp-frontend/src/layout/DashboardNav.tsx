import { NavLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Avatar,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as AccountsIcon,
  Lightbulb as InsightsIcon,
  Checklist as TasksIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/auth/useAuth';

interface DashboardNavProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  isMobile: boolean;
  width: number;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
}

const navigationItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/dashboard/accounts', label: 'Accounts', icon: <AccountsIcon /> },
  { path: '/dashboard/insights', label: 'Insights', icon: <InsightsIcon /> },
  { path: '/dashboard/tasks', label: 'Tasks', icon: <TasksIcon /> },
];

const secondaryItems: NavItem[] = [
  { path: '/dashboard/profile', label: 'Profile', icon: <ProfileIcon /> },
  { path: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon /> },
  { path: '/dashboard/help', label: 'Help', icon: <HelpIcon /> },
];

export function DashboardNav({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  isMobile,
  width,
}: DashboardNavProps) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  
  const handleSignOut = () => {
    if (logout) {
      logout();
    }
  };
  
  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header with toggle button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          p: 2,
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            PFMP
          </Typography>
        )}
        <IconButton
          onClick={onToggle}
          size="small"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      
      <Divider />
      
      {/* Primary Navigation */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={isMobile ? onCloseMobile : undefined}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'initial',
                px: 2.5,
                '&.active': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 'auto' : 3,
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </Tooltip>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* Secondary Navigation */}
      <List sx={{ pb: 2 }}>
        {secondaryItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={isMobile ? onCloseMobile : undefined}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'initial',
                px: 2.5,
                '&.active': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 'auto' : 3,
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </Tooltip>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* User Profile & Sign Out */}
      <Box sx={{ p: 2 }}>
        {!collapsed && user && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.main' }}>
              {user.name?.[0] || user.username?.[0] || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {user.name || user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.username}
              </Typography>
            </Box>
          </Box>
        )}
        
        <ListItemButton
          onClick={handleSignOut}
          sx={{
            minHeight: 48,
            justifyContent: collapsed ? 'center' : 'initial',
            px: collapsed ? 0 : 2,
            borderRadius: 1,
          }}
        >
          <Tooltip title={collapsed ? 'Sign Out' : ''} placement="right" arrow>
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 'auto' : 3,
                justifyContent: 'center',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
          </Tooltip>
          {!collapsed && <ListItemText primary="Sign Out" />}
        </ListItemButton>
      </Box>
    </Box>
  );
  
  // Mobile: Temporary drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }
  
  // Desktop: Persistent drawer
  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
