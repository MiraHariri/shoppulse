import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

  useEffect(() => {
    // Load dashboard on mount
    loadDashboard();

    // Refresh embed URL every 10 minutes (before 15-minute expiration)
    const interval = setInterval(loadDashboard, 10 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = () => {
    dispatch(fetchEmbedUrl());
  };

  // Show loading state while fetching initial URL
  if (loading && !embedUrl) {
    return <DashboardLoader />;
  }

  // Show error state if fetch failed
  if (error) {
    return <DashboardError error={error} onRetry={loadDashboard} />;
  }

  // Render dashboard iframe
  return (
    <div className="dashboard-container">
      {embedUrl && (
        <iframe
          src={embedUrl}
          width="100%"
          height="800px"
          frameBorder="0"
          title="Analytics Dashboard"
        />
      )}
    </div>
  );
}
