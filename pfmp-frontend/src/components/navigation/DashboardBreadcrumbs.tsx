import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { getCashAccount } from '../../services/cashAccountsApi';

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
  '/dashboard/tsp': { path: '/dashboard/tsp', label: 'Thrift Savings Plan' },
  '/dashboard/net-worth': { path: '/dashboard/net-worth', label: 'Net Worth Timeline' },
  '/dashboard/debt-payoff': { path: '/dashboard/debt-payoff', label: 'Debt Payoff' },
  '/dashboard/admin': { path: '/dashboard/admin', label: 'Admin' },
  '/dashboard/admin/scheduler': { path: '/dashboard/admin/scheduler', label: 'Scheduler' },
};

/**
 * DashboardBreadcrumbs
 * 
 * Displays breadcrumb navigation showing the current location path.
 * Examples:
 * - /dashboard → Dashboard
 * - /dashboard/accounts → Dashboard > Accounts
 * - /dashboard/cash-accounts/123 → Dashboard > Account Name
 */
export function DashboardBreadcrumbs() {
  const location = useLocation();
  const [accountName, setAccountName] = useState<string | null>(null);
  
  // Fetch account name if we're on a cash account detail page
  useEffect(() => {
    const fetchAccountName = async () => {
      const pathSegments = location.pathname.split('/').filter(Boolean);
      
      // Check if we're on /dashboard/cash-accounts/:uuid
      if (pathSegments[0] === 'dashboard' && 
          pathSegments[1] === 'cash-accounts' && 
          pathSegments[2]) {
        try {
          const account = await getCashAccount(pathSegments[2]);
          setAccountName(account.nickname || 'Account Details');
        } catch (err) {
          console.error('Error fetching account name for breadcrumb:', err);
          setAccountName('Account Details');
        }
      }
      // Check if we're on /dashboard/accounts/:id (investment accounts)
      else if (pathSegments[0] === 'dashboard' && 
               pathSegments[1] === 'accounts' && 
               pathSegments[2] &&
               !isNaN(Number(pathSegments[2]))) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5052/api'}/accounts/${pathSegments[2]}`);
          if (response.ok) {
            const account = await response.json();
            setAccountName(account.nickname || account.accountName || 'Account Details');
          } else {
            setAccountName('Account Details');
          }
        } catch (err) {
          console.error('Error fetching account name for breadcrumb:', err);
          setAccountName('Account Details');
        }
      }
      else {
        setAccountName(null);
      }
    };

    fetchAccountName();
  }, [location.pathname]);
  
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
        
        // Special handling for cash-accounts
        if (secondSegment === 'cash-accounts' && pathSegments.length > 2) {
          // Add "Accounts" intermediate breadcrumb
          breadcrumbs.push(breadcrumbConfigs['/dashboard/accounts']);
          // Show account name as final breadcrumb
          breadcrumbs.push({
            path: location.pathname,
            label: accountName || 'Loading...',
          });
        }
        // Special handling for investment accounts (/dashboard/accounts/:id)
        else if (secondSegment === 'accounts' && pathSegments.length > 2) {
          // Add "Accounts" breadcrumb
          breadcrumbs.push(breadcrumbConfigs['/dashboard/accounts']);
          // Show account name as final breadcrumb
          breadcrumbs.push({
            path: location.pathname,
            label: accountName || 'Loading...',
          });
        }
        // Special handling for admin/* routes (e.g., /dashboard/admin/scheduler)
        else if (secondSegment === 'admin' && pathSegments.length > 2) {
          const thirdSegment = pathSegments[2];
          const fullPath = `/dashboard/admin/${thirdSegment}`;
          breadcrumbs.push(breadcrumbConfigs['/dashboard/admin']);
          if (breadcrumbConfigs[fullPath]) {
            breadcrumbs.push(breadcrumbConfigs[fullPath]);
          } else {
            breadcrumbs.push({
              path: fullPath,
              label: thirdSegment.charAt(0).toUpperCase() + thirdSegment.slice(1),
            });
          }
        }
        // Special handling for settings/* routes (e.g., /dashboard/settings/connections)
        else if (secondSegment === 'settings' && pathSegments.length > 2) {
          const thirdSegment = pathSegments[2];
          breadcrumbs.push(breadcrumbConfigs['/dashboard/settings']);
          breadcrumbs.push({
            path: location.pathname,
            label: thirdSegment.charAt(0).toUpperCase() + thirdSegment.slice(1),
          });
        }
        else if (breadcrumbConfigs[secondPath]) {
          breadcrumbs.push(breadcrumbConfigs[secondPath]);
          
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
