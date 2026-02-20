/**
 * Unit tests for userService
 * Tests the CRUD operations for user management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from '../userService';
import * as apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import type { User, CreateUserData } from '../../types/user.types';

// Mock the apiClient
vi.mock('../../utils/apiClient', () => ({
  apiRequest: vi.fn(),
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should fetch all users for the tenant', async () => {
      const mockUsers: User[] = [
        {
          user_id: 'U001',
          email: 'user1@example.com',
          role: 'Finance',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'U002',
          email: 'user2@example.com',
          role: 'Operations',
          status: 'active',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockUsers);

      const result = await userService.listUsers();

      expect(apiClient.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.USERS);
      expect(result).toEqual(mockUsers);
    });

    it('should handle errors when fetching users', async () => {
      const errorMessage = 'Failed to fetch users';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await expect(userService.listUsers()).rejects.toThrow(errorMessage);
    });
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData: CreateUserData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'Finance',
      };

      const mockCreatedUser: User = {
        user_id: 'U003',
        email: userData.email,
        role: userData.role,
        status: 'active',
        created_at: '2024-01-03T00:00:00Z',
      };

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(apiClient.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.USERS, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle duplicate email error', async () => {
      const userData: CreateUserData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'Finance',
      };

      const errorMessage = 'User with this email already exists';
      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await expect(userService.createUser(userData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const userId = 'U001';
      const newRole = 'Admin';

      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await userService.updateUserRole(userId, newRole);

      expect(apiClient.apiRequest).toHaveBeenCalledWith(
        `${API_ENDPOINTS.USERS}/${userId}/role`,
        {
          method: 'PUT',
          body: JSON.stringify({ role: newRole }),
        }
      );
    });

    it('should handle cross-tenant access error', async () => {
      const userId = 'U999';
      const newRole = 'Admin';
      const errorMessage = 'Access denied: resource belongs to different tenant';

      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await expect(userService.updateUserRole(userId, newRole)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'U001';

      vi.mocked(apiClient.apiRequest).mockResolvedValue(undefined);

      await userService.deleteUser(userId);

      expect(apiClient.apiRequest).toHaveBeenCalledWith(
        `${API_ENDPOINTS.USERS}/${userId}`,
        {
          method: 'DELETE',
        }
      );
    });

    it('should handle user not found error', async () => {
      const userId = 'U999';
      const errorMessage = 'User not found';

      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await expect(userService.deleteUser(userId)).rejects.toThrow(errorMessage);
    });
  });

  describe('getUserById', () => {
    it('should fetch a specific user by ID', async () => {
      const userId = 'U001';
      const mockUser: User = {
        user_id: userId,
        email: 'user1@example.com',
        role: 'Finance',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.apiRequest).mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(apiClient.apiRequest).toHaveBeenCalledWith(
        `${API_ENDPOINTS.USERS}/${userId}`
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found error', async () => {
      const userId = 'U999';
      const errorMessage = 'User not found';

      vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error(errorMessage));

      await expect(userService.getUserById(userId)).rejects.toThrow(errorMessage);
    });
  });
});
