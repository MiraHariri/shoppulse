import type { EmbedUrlResponse } from '../types/dashboard.types';
import { apiRequest } from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get QuickSight Q agent embed URL
 */
export async function getQAgentEmbedUrl(): Promise<string> {
  const response = await apiRequest<EmbedUrlResponse>(API_ENDPOINTS.Q_AGENT_EMBED);
  return response.embedUrl;
}
