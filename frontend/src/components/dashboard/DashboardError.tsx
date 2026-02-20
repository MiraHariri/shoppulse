import { Box, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface DashboardErrorProps {
  error: string;
  onRetry: () => void;
}

/**
 * DashboardError Component
 * 
 * Displays error message with retry button when dashboard fails to load
 * 
 * Requirements: 10.5
 */
export default function DashboardError({ error, onRetry }: DashboardErrorProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '800px',
        gap: 3,
        padding: 3,
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          Failed to Load Dashboard
        </Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>

      <Button
        variant="contained"
        color="primary"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        size="large"
      >
        Retry
      </Button>
    </Box>
  );
}
