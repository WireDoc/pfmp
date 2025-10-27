import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';

interface BreadcrumbConfig {
  path: string;
  label: string;
  icon?: React.ReactElement;
}

// Define breadcrumb configurations for dashboard routes
const breadcrumbConfigs: Record<string, BreadcrumbConfig> = {
  '/dashboard': { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon sx={{ fontSize: 20 }} /> },
  '/dashboard/accounts': { path: '/dashboard/accounts', label: 'Accounts' },
  '/dashboard/insights': { path: '/dashboard/insights', label: 'Insights' },
  '/dashboard/tasks': { path: '/dashboard/tasks', label: 'Tasks' },
  '/dashboard/profile': { path: '/dashboard/profile', label: 'Profile' },
  '/dashboard/settings': { path: '/dashboard/settings', label: 'Settings' },
  '/dashboard/help': { path: '/dashboard/help', label: 'Help' },
};

/**
 * DashboardBreadcrumbs
 * 
 * Displays breadcrumb navigation showing the current location path.
 * Examples:
 * - /dashboard → Dashboard
 * - /dashboard/accounts → Dashboard > Accounts
 * - /dashboard/accounts/123 → Dashboard > Accounts > Account Details
 */
export function DashboardBreadcrumbs() {
  const location = useLocation();
  
  // Build breadcrumb trail from current path
  const buildBreadcrumbs = (): BreadcrumbConfig[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbConfig[] = [];
    
    // Always start with dashboard
    if (pathSegments[0] === 'dashboard') {
      breadcrumbs.push(breadcrumbConfigs['/dashboard']);
      
      // Add subsequent segments
      if (pathSegments.length > 1) {
        const secondSegment = pathSegments[1];
        const secondPath = `/dashboard/${secondSegment}`;
        
        if (breadcrumbConfigs[secondPath]) {
          breadcrumbs.push(breadcrumbConfigs[secondPath]);
        }
        
        // If there's a third segment (like an ID), add a generic label
        if (pathSegments.length > 2) {
          const thirdSegment = pathSegments[2];
          breadcrumbs.push({
            path: location.pathname,
            label: isNaN(Number(thirdSegment)) ? thirdSegment : 'Details',
          });
        }
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = buildBreadcrumbs();
  
  // Don't show breadcrumbs if we're just on the main dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb navigation"
        sx={{ fontSize: '0.875rem' }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast) {
            // Current page - not clickable
            return (
              <Typography
                key={crumb.path}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {crumb.icon}
                {crumb.label}
              </Typography>
            );
          }
          
          // Clickable breadcrumb link
          return (
            <Link
              key={crumb.path}
              component={RouterLink}
              to={crumb.path}
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {crumb.icon}
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
