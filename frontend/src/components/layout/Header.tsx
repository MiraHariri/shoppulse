import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import { AccountCircle, Logout, Settings, People } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null);

  const handleAccountMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAccountAnchorEl(event.currentTarget);
  };

  const handleAccountClose = () => {
    setAccountAnchorEl(null);
  };

  const handleLogout = async () => {
    handleAccountClose();
    await logout();
  };

  const handleNavigateToUsers = () => {
    handleAccountClose();
    navigate('/users');
  };

  const handleNavigateToSettings = () => {
    handleAccountClose();
    navigate('/settings');
  };

  // Check if user has access to management features
  const hasManagementAccess = user?.role === 'Admin';

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'white',
        color: '#1F2937',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          ShopPulse Analytics
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user.email}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6366F1' }}>
                {user.role}
              </Typography>
            </Box>
            
            <IconButton
              size="large"
              aria-label="account menu"
              aria-controls="account-menu"
              aria-haspopup="true"
              onClick={handleAccountMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              id="account-menu"
              anchorEl={accountAnchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(accountAnchorEl)}
              onClose={handleAccountClose}
            >
              {/* Management options - only for Admin users */}
              {hasManagementAccess && [
                <MenuItem key="users" onClick={handleNavigateToUsers}>
                  <People sx={{ mr: 1, fontSize: 20 }} />
                  Users
                </MenuItem>,
                <MenuItem key="settings" onClick={handleNavigateToSettings}>
                  <Settings sx={{ mr: 1, fontSize: 20 }} />
                  Settings
                </MenuItem>,
                <Divider key="divider" sx={{ my: 1 }} />
              ]}
              
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1, fontSize: 20 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
