import { Box, Typography, Paper } from '@mui/material';

export default function SettingsPage() {
  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1F2937', mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure application settings and preferences
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid #E5E7EB',
          bgcolor: 'white',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Settings configuration will be implemented here.
        </Typography>
      </Paper>
    </>
  );
}
