import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchEmbedUrl, clearEmbedUrl } from '../store/dashboardSlice';

/**
 * Custom hook for dashboard management
 */
export const useDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { embedUrl, loading, error } = useSelector((state: RootState) => state.dashboard);
  
  const loadDashboard = () => {
    dispatch(fetchEmbedUrl());
  };
  
  const clearDashboard = () => {
    dispatch(clearEmbedUrl());
  };
  
  return {
    embedUrl,
    loading,
    error,
    loadDashboard,
    clearDashboard,
  };
};
