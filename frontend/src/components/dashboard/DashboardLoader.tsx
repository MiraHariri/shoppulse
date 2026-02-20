import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

/**
 * DashboardLoader Component
 * 
 * Displays loading spinner with branded animation while dashboard is loading
 * Uses brand colors (deep purple #6366F1 and teal #14B8A6) for a modern look
 * 
 * Requirements: 10.4
 */

// Spinning animation for the outer ring
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Pulsing animation for the inner circle
const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

export default function DashboardLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '800px',
        gap: 3,
      }}
    >
      {/* Branded spinner with dual-color rings */}
      <Box
        sx={{
          position: 'relative',
          width: 80,
          height: 80,
        }}
      >
        {/* Outer ring - Primary color (deep purple) */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '4px solid transparent',
            borderTopColor: '#6366F1',
            borderRightColor: '#6366F1',
            borderRadius: '50%',
            animation: `${spin} 1.2s linear infinite`,
          }}
        />
        
        {/* Middle ring - Secondary color (teal) */}
        <Box
          sx={{
            position: 'absolute',
            width: '70%',
            height: '70%',
            top: '15%',
            left: '15%',
            border: '3px solid transparent',
            borderBottomColor: '#14B8A6',
            borderLeftColor: '#14B8A6',
            borderRadius: '50%',
            animation: `${spin} 1.5s linear infinite reverse`,
          }}
        />
        
        {/* Inner pulsing circle */}
        <Box
          sx={{
            position: 'absolute',
            width: '40%',
            height: '40%',
            top: '30%',
            left: '30%',
            backgroundColor: '#6366F1',
            borderRadius: '50%',
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
      </Box>

      {/* Loading text */}
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#6B7280',
          fontWeight: 500,
        }}
      >
        Loading Dashboard...
      </Typography>
    </Box>
  );
}
