import type { EmbedUrlResponse } from '../types/dashboard.types';
import { apiRequest } from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get QuickSight embed URL for dashboard
 */
export async function getEmbedUrl(): Promise<string> {
  const response = await apiRequest<EmbedUrlResponse>(API_ENDPOINTS.DASHBOARD_EMBED);
  return response.embedUrl;
}
