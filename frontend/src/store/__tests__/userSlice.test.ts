import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import userReducer, {
  fetchUsers,
  createUser,
  updateUserRole,
  deleteUser,
  clearError,
} from '../userSlice';
import * as apiClient from '../../utils/apiClient';

// Mock the apiClient
vi.mock('../../utils/apiClient', () => ({
  apiRequest: vi.fn(),
}));

describe('userSlice', () => {
  let store: EnhancedStore;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        users: userReducer,
      },
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().users;
      expect(state).toEqual({
        users: [],
        loading: false,
        error: null,
      });
    });
  });

  describe('clearError action', () => {
    it('should clear error state', () => {
      // Set up state with an error
      store = configureStore({
        reducer: {
          users: userReducer,
        },
        preloadedState: {
          users: {
            users: [],
            loading: false,
            error: 'Some error',
          },
        },
      });

      store.dispatch(clearError());

      const state = store.getState().users;
      expect(state.error).toBeNull();
    });
  });

  describe('fetchUsers', () => {
    it('should set loading to true when pending', () => {
      vi.mocked(apiClient.apiRequest).mockReturnValue(new Promise(() => {}));

      store.dispatch(fetchUsers());

      const state = store.getState().users;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should populate users array when fulfilled', async () => {
      const mockUsers = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          role: 'Finance' as const,
          status: 'active' as const,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          role: 'Operations' as const,
          status: 'active' as const,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockUsers);

      await store.dispatch(fetchUsers());

      const state = store.getState().users;
      expect(state.users).toEqual(mockUsers);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to fetch users';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(fetchUsers());

      const state = store.getState().users;
      expect(state.users).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle empty users array', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue([]);

      await store.dispatch(fetchUsers());

      const state = store.getState().users;
      expect(state.users).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should set loading to true when pending', () => {
      vi.mocked(apiClient.apiRequest).mockReturnValue(new Promise(() => {}));

      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'Finance' as const,
      };

      store.dispatch(createUser(userData));

      const state = store.getState().users;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add new user to users array when fulfilled', async () => {
      const newUser = {
        user_id: 'user-3',
        email: 'newuser@example.com',
        role: 'Finance' as const,
        status: 'active' as const,
        created_at: '2024-01-03T00:00:00Z',
      };

      vi.mocked(apiClient.apiRequest).mockResolvedValue(newUser);

      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'Finance' as const,
      };

      await store.dispatch(createUser(userData));

      const state = store.getState().users;
      expect(state.users).toContainEqual(newUser);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to create user';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'Finance' as const,
      };

      await store.dispatch(createUser(userData));

      const state = store.getState().users;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle duplicate email error', async () => {
      const errorMessage = 'User with this email already exists';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'Finance' as const,
      };

      await store.dispatch(createUser(userData));

      const state = store.getState().users;
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateUserRole', () => {
    beforeEach(() => {
      // Set up initial state with users
      store = configureStore({
        reducer: {
          users: userReducer,
        },
        preloadedState: {
          users: {
            users: [
              {
                user_id: 'user-1',
                email: 'user1@example.com',
                role: 'Finance' as const,
                status: 'active' as const,
                created_at: '2024-01-01T00:00:00Z',
              },
            ],
            loading: false,
            error: null,
          },
        },
      });
    });

    it('should set loading to true when pending', () => {
      vi.mocked(apiClient.apiRequest).mockReturnValue(new Promise(() => {}));

      store.dispatch(updateUserRole({ userId: 'user-1', role: 'Operations' }));

      const state = store.getState().users;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update user role when fulfilled', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await store.dispatch(updateUserRole({ userId: 'user-1', role: 'Operations' }));

      const state = store.getState().users;
      const updatedUser = state.users.find((u) => u.user_id === 'user-1');
      expect(updatedUser?.role).toBe('Operations');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should not modify other user properties when updating role', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      const originalUser = store.getState().users.users[0];

      await store.dispatch(updateUserRole({ userId: 'user-1', role: 'Marketing' }));

      const state = store.getState().users;
      const updatedUser = state.users.find((u) => u.user_id === 'user-1');
      expect(updatedUser?.email).toBe(originalUser.email);
      expect(updatedUser?.status).toBe(originalUser.status);
      expect(updatedUser?.created_at).toBe(originalUser.created_at);
    });

    it('should handle non-existent user gracefully', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await store.dispatch(updateUserRole({ userId: 'non-existent', role: 'Admin' }));

      const state = store.getState().users;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to update user role';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(updateUserRole({ userId: 'user-1', role: 'Operations' }));

      const state = store.getState().users;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      // Set up initial state with users
      store = configureStore({
        reducer: {
          users: userReducer,
        },
        preloadedState: {
          users: {
            users: [
              {
                user_id: 'user-1',
                email: 'user1@example.com',
                role: 'Finance' as const,
                status: 'active' as const,
                created_at: '2024-01-01T00:00:00Z',
              },
              {
                user_id: 'user-2',
                email: 'user2@example.com',
                role: 'Operations' as const,
                status: 'active' as const,
                created_at: '2024-01-02T00:00:00Z',
              },
            ],
            loading: false,
            error: null,
          },
        },
      });
    });

    it('should set loading to true when pending', () => {
      vi.mocked(apiClient.apiRequest).mockReturnValue(new Promise(() => {}));

      store.dispatch(deleteUser('user-1'));

      const state = store.getState().users;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove user from users array when fulfilled', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await store.dispatch(deleteUser('user-1'));

      const state = store.getState().users;
      expect(state.users).toHaveLength(1);
      expect(state.users.find((u) => u.user_id === 'user-1')).toBeUndefined();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should not affect other users when deleting', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      const user2 = store.getState().users.users[1];

      await store.dispatch(deleteUser('user-1'));

      const state = store.getState().users;
      expect(state.users).toContainEqual(user2);
    });

    it('should handle non-existent user gracefully', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      const initialCount = store.getState().users.users.length;

      await store.dispatch(deleteUser('non-existent'));

      const state = store.getState().users;
      expect(state.users).toHaveLength(initialCount);
      expect(state.loading).toBe(false);
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to delete user';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(deleteUser('user-1'));

      const state = store.getState().users;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle deleting all users', async () => {
      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await store.dispatch(deleteUser('user-1'));
      await store.dispatch(deleteUser('user-2'));

      const state = store.getState().users;
      expect(state.users).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple concurrent operations', async () => {
      const mockUsers = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          role: 'Finance' as const,
          status: 'active' as const,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockUsers);

      // Dispatch multiple operations
      const promises = [
        store.dispatch(fetchUsers()),
        store.dispatch(fetchUsers()),
      ];

      await Promise.all(promises);

      const state = store.getState().users;
      expect(state.users).toEqual(mockUsers);
      expect(state.loading).toBe(false);
    });

    it('should maintain state consistency after error', async () => {
      // First, successfully fetch users
      const mockUsers = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          role: 'Finance' as const,
          status: 'active' as const,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockUsers);
      await store.dispatch(fetchUsers());

      // Then, fail to create a user
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error('Creation failed'));
      await store.dispatch(createUser({
        email: 'new@example.com',
        password: 'pass',
        role: 'Admin',
      }));

      const state = store.getState().users;
      expect(state.users).toEqual(mockUsers); // Original users should remain
      expect(state.error).toBe('Creation failed');
    });
  });
});
