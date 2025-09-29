import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountBalance,
  Savings,
  TrendingUp,
  LocalHospital,
  MoreVert,
  Person,
  Dashboard as DashboardIcon,
  Assignment,
  NotificationImportant,
  PsychologyAlt,
} from '@mui/icons-material';
import { TSPAllocationForm } from './forms/TSPAllocationForm';
import { EmergencyFundTracker } from './forms/EmergencyFundTracker';
import { CashAccountManager } from './forms/CashAccountManager';
import { VADisabilityTracker } from './forms/VADisabilityTracker';
import { TaskDashboard } from './TaskDashboard';
import { AlertsDashboard } from './AlertsDashboard';
import AdvicePanel from './AdvicePanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

interface DashboardProps {
  userId?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId = 1 }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1);
    handleMenuClose();
  };

  const tabs = [
    {
      label: 'TSP Allocation',
      icon: <TrendingUp />,
      component: <TSPAllocationForm userId={userId} key={`tsp-${refreshKey}`} onUpdate={handleRefreshData} />
    },
    {
      label: 'Emergency Fund',
      icon: <Savings />,
      component: <EmergencyFundTracker userId={userId} key={`emergency-${refreshKey}`} onUpdate={handleRefreshData} />
    },
    {
      label: 'Cash Accounts',
      icon: <AccountBalance />,
      component: <CashAccountManager userId={userId} key={`cash-${refreshKey}`} onUpdate={handleRefreshData} />
    },
    {
      label: 'VA Disability',
      icon: <LocalHospital />,
      component: <VADisabilityTracker userId={userId} key={`va-${refreshKey}`} onUpdate={handleRefreshData} />
    },
    {
      label: 'Tasks',
      icon: <Assignment />,
      component: <TaskDashboard userId={userId} key={`tasks-${refreshKey}`} />
    },
    {
      label: 'Alerts',
      icon: <NotificationImportant />,
      component: <AlertsDashboard userId={userId} key={`alerts-${refreshKey}`} />
    },
    // Temporary Wave 1 Advice tab (can be removed later)
    {
      label: 'Advice (Temp)',
      icon: <PsychologyAlt />,
      component: <AdvicePanel userId={userId} key={`advice-${refreshKey}`} />
    }
  ];

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Personal Financial Management Platform
          </Typography>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleMenuOpen}
          >
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleRefreshData}>
              <DashboardIcon sx={{ mr: 1 }} />
              Refresh Data
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <Person sx={{ mr: 1 }} />
              Profile Settings
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Financial Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your personal finances with a focus on government employee benefits and passive income optimization.
          </Typography>
        </Box>

        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              aria-label="financial dashboard tabs"
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 72,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  iconPosition="start"
                  label={tab.label}
                  {...a11yProps(index)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {tabs.map((tab, index) => (
            <TabPanel key={index} value={currentTab} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </Paper>

        {/* Quick Stats Overview */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Overview
          </Typography>
          <Box sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            }
          }}>
            <Box>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp color="primary" fontSize="large" />
                <Typography variant="h6" color="primary">
                  TSP Allocation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your Thrift Savings Plan fund allocation for optimal retirement growth
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Savings color="success" fontSize="large" />
                <Typography variant="h6" color="success.main">
                  Emergency Fund
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track progress toward your emergency fund target and optimize cash placement
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <AccountBalance color="info" fontSize="large" />
                <Typography variant="h6" color="info.main">
                  Cash Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Optimize your cash accounts with APR tracking and yield recommendations
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <LocalHospital color="warning" fontSize="large" />
                <Typography variant="h6" color="warning.main">
                  VA Benefits
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track VA disability compensation and other veteran benefits
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* Key Features */}
        <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Platform Features
          </Typography>
          <Box sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr'
            }
          }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Government Employee Focus:
              </Typography>
              <Typography variant="body2" paragraph>
                • TSP fund allocation management with preset strategies
                <br />
                • VA disability benefit tracking and optimization
                <br />
                • Federal employee benefit integration
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom color="success.main">
                Cash Optimization:
              </Typography>
              <Typography variant="body2" paragraph>
                • High-yield savings account recommendations
                <br />
                • Emergency fund progress tracking
                <br />
                • APR comparison and yield optimization
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default Dashboard;