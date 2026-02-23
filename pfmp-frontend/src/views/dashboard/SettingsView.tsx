import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import SecurityIcon from '@mui/icons-material/Security';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/**
 * SettingsView - User settings and configuration
 * Route: /dashboard/settings
 */
export function SettingsView() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {/* Connected Accounts Section */}
      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Connected Accounts
        </Typography>
        <Divider />
        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigate('/dashboard/settings/connections')}>
              <ListItemIcon>
                <LinkIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Connected Accounts" 
                secondary="Manage all linked bank, investment, credit card, and loan accounts"
              />
              <ChevronRightIcon color="action" />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>

      {/* Preferences Section - Coming Soon */}
      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Preferences
        </Typography>
        <Divider />
        <List disablePadding>
          <ListItem>
            <ListItemIcon>
              <NotificationsIcon color="disabled" />
            </ListItemIcon>
            <ListItemText 
              primary="Notifications" 
              secondary="Email and alert preferences"
            />
            <Chip label="Coming Soon" size="small" variant="outlined" />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon>
              <ColorLensIcon color="disabled" />
            </ListItemIcon>
            <ListItemText 
              primary="Appearance" 
              secondary="Theme and display options"
            />
            <Chip label="Coming Soon" size="small" variant="outlined" />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="disabled" />
            </ListItemIcon>
            <ListItemText 
              primary="Security" 
              secondary="Password and authentication settings"
            />
            <Chip label="Coming Soon" size="small" variant="outlined" />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}
