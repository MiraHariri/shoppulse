/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AddMetricsData, CreateRoleData, Role } from "../types/role.types";
import { apiRequest } from "../utils/apiClient";

export const roleService = {
  async listRoles(): Promise<{ roles: Role[]; count: number }> {
    return apiRequest<{ roles: Role[]; count: number }>("/roles", {
      method: "GET",
    });
  },

  async getRole(role: string): Promise<Role> {
    return apiRequest<Role>(`/roles/${encodeURIComponent(role)}`, {
      method: "GET",
    });
  },

  async createRole(data: CreateRoleData): Promise<Role> {
    return apiRequest<Role>("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async addMetrics(
    role: string,
    data: AddMetricsData,
  ): Promise<{ role: string; added: any[] }> {
    return apiRequest<{ role: string; added: any[] }>(
      `/roles/${encodeURIComponent(role)}/metrics`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async removeMetric(
    role: string,
    metricName: string,
  ): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(
      `/roles/${encodeURIComponent(role)}/metrics/${encodeURIComponent(metricName)}`,
      {
        method: "DELETE",
      },
    );
  },

  async deleteRole(role: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(
      `/roles/${encodeURIComponent(role)}`,
      {
        method: "DELETE",
      },
    );
  },
};
