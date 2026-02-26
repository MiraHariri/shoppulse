import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { roleService } from "../services/roleService";
import type { CreateRoleData, Role } from "../types/role.types";

interface RoleState {
  roles: Role[];
  loading: boolean;
  error: string | null;
}

const initialState: RoleState = {
  roles: [],
  loading: false,
  error: null,
};

export const fetchRoles = createAsyncThunk("roles/fetchRoles", async () => {
  const response = await roleService.listRoles();
  return response.roles;
});

export const createRole = createAsyncThunk(
  "roles/createRole",
  async (data: CreateRoleData) => {
    return await roleService.createRole(data);
  },
);

export const addMetrics = createAsyncThunk(
  "roles/addMetrics",
  async ({ role, metrics }: { role: string; metrics: string[] }) => {
    const response = await roleService.addMetrics(role, { metrics });
    return { role, added: response.added };
  },
);

export const removeMetric = createAsyncThunk(
  "roles/removeMetric",
  async ({ role, metricName }: { role: string; metricName: string }) => {
    await roleService.removeMetric(role, metricName);
    return { role, metricName };
  },
);

export const deleteRole = createAsyncThunk(
  "roles/deleteRole",
  async (role: string) => {
    await roleService.deleteRole(role);
    return role;
  },
);

const roleSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch roles
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action: PayloadAction<Role[]>) => {
        state.roles = action.payload;
        state.loading = false;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch roles";
        state.loading = false;
      })
      // Create role
      .addCase(createRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action: PayloadAction<Role>) => {
        state.roles.push(action.payload);
        state.loading = false;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.error = action.error.message || "Failed to create role";
        state.loading = false;
      })
      // Add metrics
      .addCase(addMetrics.fulfilled, (state, action) => {
        const role = state.roles.find((r) => r.role === action.payload.role);
        if (role) {
          role.metrics.push(...action.payload.added);
        }
      })
      // Remove metric
      .addCase(removeMetric.fulfilled, (state, action) => {
        const role = state.roles.find((r) => r.role === action.payload.role);
        if (role) {
          role.metrics = role.metrics.filter(
            (m) => m.metric_name !== action.payload.metricName,
          );
        }
      })
      // Delete role
      .addCase(deleteRole.fulfilled, (state, action: PayloadAction<string>) => {
        state.roles = state.roles.filter((r) => r.role !== action.payload);
      });
  },
});

export const { clearError } = roleSlice.actions;
export default roleSlice.reducer;
