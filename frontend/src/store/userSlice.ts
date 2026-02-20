/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { User, CreateUserData, UserState } from "../types/user.types";
import { apiRequest } from "../utils/apiClient";
import { API_ENDPOINTS } from "../utils/constants";

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

/**
 * Fetch all users for the current tenant
 */
export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  return await apiRequest(API_ENDPOINTS.USERS);
});

/**
 * Create a new user
 */
export const createUser = createAsyncThunk(
  "users/createUser",
  async (userData: CreateUserData) => {
    return await apiRequest<User>(API_ENDPOINTS.USERS, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },
);

/**
 * Update user role
 */
export const updateUserRole = createAsyncThunk(
  "users/updateUserRole",
  async ({ userId, role }: { userId: string; role: string }) => {
    await apiRequest<void>(`${API_ENDPOINTS.USERS}/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    return { userId, role };
  },
);

/**
 * Delete user
 */
export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (userId: string) => {
    await apiRequest<void>(`${API_ENDPOINTS.USERS}/${userId}`, {
      method: "DELETE",
    });
    return userId;
  },
);

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: any) => {
        state.users = action.payload.users;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch users";
        state.loading = false;
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.unshift(action.payload);
        state.loading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.error = action.error.message || "Failed to create user";
        state.loading = false;
      })
      // Update user role
      .addCase(updateUserRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const user = state.users.find(
          (u) => u.user_id === action.payload.userId,
        );
        if (user) {
          user.role = action.payload.role as typeof user.role;
        }
        state.loading = false;
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.error = action.error.message || "Failed to update user role";
        state.loading = false;
      })
      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.users = state.users.filter((u) => u.user_id !== action.payload);
        state.loading = false;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.error.message || "Failed to delete user";
        state.loading = false;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
