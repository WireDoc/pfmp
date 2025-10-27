import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { DashboardProvider } from '../contexts/dashboard/DashboardProvider';
import { useDashboard } from '../contexts/dashboard/useDashboard';
import { DashboardNav } from './DashboardNav';
import { DashboardBreadcrumbs } from '../components/navigation/DashboardBreadcrumbs';
import { DevUserSwitcher } from '../dev/DevUserSwitcher';
import { useAuth } from '../contexts/auth/useAuth';

/**
 * DashboardLayout
 * 
 * Wrapper component for all /dashboard/* routes.
 * Provides persistent left sidebar navigation with responsive behavior:
 * - Desktop (≥900px): Persistent sidebar, collapsible to icon-only mode
 * - Mobile (<900px): Hamburger menu with drawer
 */
function DashboardLayoutInner() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <900px
  const { setSidebarWidth } = useDashboard();
  const { isDev } = useAuth();
  
  // Sidebar state: collapsed (icon-only) or expanded (full width)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileDrawerOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };
  
  const handleCloseMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };
  
  // Calculate sidebar width based on state
  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 240);
  
  // Update context whenever sidebar width changes
  useEffect(() => {
    setSidebarWidth(sidebarWidth);
  }, [sidebarWidth, setSidebarWidth]);
  
  return (
    <>
      {/* Sidebar Navigation */}
      <DashboardNav
        collapsed={sidebarCollapsed}
        mobileOpen={mobileDrawerOpen}
        onToggle={handleToggleSidebar}
        onCloseMobile={handleCloseMobileDrawer}
        isMobile={isMobile}
        width={sidebarWidth || 240}
      />
      
      {/* Main Content Area with left margin to account for fixed sidebar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Add left margin only on desktop to account for fixed sidebar
          marginLeft: isMobile ? 0 : `${sidebarWidth}px`,
        }}
      >
        {/* Breadcrumb Navigation */}
        <DashboardBreadcrumbs />
        
        {/* Route Content */}
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        
        {/* Dev Tools */}
        {isDev && (
          <Box sx={{ p: '12px 16px', mt: 'auto' }}>
            <DevUserSwitcher />
          </Box>
        )}
      </Box>
    </>
  );
}

export function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardLayoutInner />
    </DashboardProvider>
  );
}
