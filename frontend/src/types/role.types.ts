export interface RoleMetric {
  id: number;
  metric_name: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role: string;
  metrics: RoleMetric[];
}

export interface CreateRoleData {
  role: string;
  metrics: string[];
}

export interface AddMetricsData {
  metrics: string[];
}
