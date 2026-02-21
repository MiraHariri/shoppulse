import { Box, Typography, Paper } from '@mui/material';
import DashboardEmbed from '../components/dashboard/DashboardEmbed';

export default function DashboardPage() {
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
          Analytics Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time insights and analytics for your business
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 2,
          border: '1px solid #E5E7EB',
          bgcolor: 'white',
        }}
      >
        <DashboardEmbed />
      </Paper>
    </>
  );
}
