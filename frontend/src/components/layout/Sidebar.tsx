import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Divider } from '@mui/material';
import { Dashboard, People, Settings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DRAWER_WIDTH = 240;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['Admin', 'Finance', 'Operations', 'Marketing']
    },
    {
      text: 'Users',
      icon: <People />,
      path: '/users',
      roles: ['Admin']
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
      roles: ['Admin', 'Finance', 'Operations', 'Marketing']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'white',
          borderRight: '1px solid #E5E7EB',
          pt: 8
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 1,
                    bgcolor: isActive ? '#EEF2FF' : 'transparent',
                    color: isActive ? '#6366F1' : '#1F2937',
                    '&:hover': {
                      bgcolor: isActive ? '#EEF2FF' : '#F3F4F6'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? '#6366F1' : '#6B7280',
                      minWidth: 40
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ my: 1 }} />
      </Box>
    </Drawer>
  );
}
