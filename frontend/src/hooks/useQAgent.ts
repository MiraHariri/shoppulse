import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchQAgentEmbedUrl, clearQAgentEmbedUrl } from '../store/qAgentSlice';

/**
 * Custom hook for Q agent management
 */
export const useQAgent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { embedUrl, loading, error } = useSelector((state: RootState) => state.qAgent);
  
  const loadQAgent = () => {
    dispatch(fetchQAgentEmbedUrl());
  };
  
  const clearQAgent = () => {
    dispatch(clearQAgentEmbedUrl());
  };
  
  return {
    embedUrl,
    loading,
    error,
    loadQAgent,
    clearQAgent,
  };
};
