import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { DashboardNav } from './DashboardNav';

/**
 * DashboardLayout
 * 
 * Wrapper component for all /dashboard/* routes.
 * Provides persistent left sidebar navigation with responsive behavior:
 * - Desktop (≥900px): Persistent sidebar, collapsible to icon-only mode
 * - Mobile (<900px): Hamburger menu with drawer
 */
export function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <900px
  
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
  const sidebarWidth = sidebarCollapsed ? 64 : 240;
  
  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100%' }}>
      {/* Sidebar Navigation */}
      <DashboardNav
        collapsed={sidebarCollapsed}
        mobileOpen={mobileDrawerOpen}
        onToggle={handleToggleSidebar}
        onCloseMobile={handleCloseMobileDrawer}
        isMobile={isMobile}
        width={sidebarWidth}
      />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          p: 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Add left margin only on desktop to account for fixed sidebar
          ...(!isMobile && {
            marginLeft: `${sidebarWidth}px`,
          }),
        }}
      >
        {/* Route content rendered here */}
        <Outlet />
      </Box>
    </Box>
  );
}
