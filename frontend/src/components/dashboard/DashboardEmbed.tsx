import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Alert } from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { fetchEmbedUrl } from '../../store/dashboardSlice';
import DashboardLoader from './DashboardLoader';
import DashboardError from './DashboardError';
import './DashboardEmbed.css';

/**
 * DashboardEmbed Component
 * 
 * Embeds QuickSight dashboard with automatic URL refresh
 * - Requests embed URL on mount
 * - Renders dashboard in iframe
 * - Auto-refreshes URL every 10 minutes (before 15-minute expiration)
 * - Handles loading and error states
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
export default function DashboardEmbed() {
  const dispatch = useDispatch<AppDispatch>();
  const { embedUrl, loading, error } = useSelector((state: RootState) => state.dashboard);
  const { user } = useSelector((state: RootState) => state.auth);
  const hasLoadedRef = useRef(false);

  const loadDashboard = useCallback(() => {
    dispatch(fetchEmbedUrl());
  }, [dispatch]);

  useEffect(() => {
    // Only load if user is authenticated and hasn't loaded yet
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDashboard();
    }

    // Refresh embed URL every 10 minutes (before 15-minute expiration)
    const interval = setInterval(() => {
      if (user) {
        loadDashboard();
      }
    }, 10 * 60 * 1000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [loadDashboard, user]);

  // Show loading state while fetching initial URL
  if (loading && !embedUrl) {
    return <DashboardLoader />;
  }

  // Show error state if fetch failed
  if (error) {
    // Check if it's a configuration error
    const isConfigError = error.includes('configuration') || error.includes('not configured');
    
    if (isConfigError) {
      return (
        <div className="dashboard-container">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '700px',
              gap: 3,
              padding: 3,
            }}
          >
            <Alert severity="info" sx={{ maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom>
                Dashboard Configuration Pending
              </Typography>
              <Typography variant="body2">
                The QuickSight dashboard is not yet configured. Please contact your administrator to set up the analytics dashboard.
              </Typography>
            </Alert>
          </Box>
        </div>
      );
    }
    
    return <DashboardError error={error} onRetry={loadDashboard} />;
  }

  // Render dashboard iframe
  return (
    <div className="dashboard-container">
      {embedUrl && (
        <>
          {console.log('QuickSight Embed URL:', embedUrl)}
          <iframe
            src={embedUrl}
            width="100%"
            height="700px"
            style={{ border: 0 }}
            title="Analytics Dashboard"
            allow="fullscreen"
          />
        </>
      )}
    </div>
  );
}
