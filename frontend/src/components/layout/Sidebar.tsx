import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Divider } from '@mui/material';
import { Dashboard } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

export default function Sidebar({ mobileOpen, onDrawerToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['Admin', 'Finance', 'Operations', 'Marketing']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close mobile drawer after navigation
    if (mobileOpen) {
      onDrawerToggle();
    }
  };

  const drawerContent = (
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
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'white',
            borderRight: '1px solid #E5E7EB',
            pt: 8
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
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
        {drawerContent}
      </Drawer>
    </>
  );
}
