import { Box, Typography, Paper } from '@mui/material';
import UserList from '../components/users/UserList';

export default function UsersPage() {
  return (
    <>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 600, 
            color: '#1F2937', 
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          User Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage user accounts and permissions
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: '1px solid #E5E7EB',
          bgcolor: 'white',
        }}
      >
        <UserList />
      </Paper>
    </>
  );
}
