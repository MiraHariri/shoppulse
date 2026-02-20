export interface EmbedUrlResponse {
  embedUrl: string;
}

export interface DashboardState {
  embedUrl: string | null;
  loading: boolean;
  error: string | null;
}
