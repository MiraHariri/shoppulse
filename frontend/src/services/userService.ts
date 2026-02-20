import type { User, CreateUserData } from '../types/user.types';
import { apiRequest } from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

/**
 * Get all users for the current tenant
 */
export async function listUsers(): Promise<User[]> {
  return await apiRequest<User[]>(API_ENDPOINTS.USERS);
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  return await apiRequest<User>(API_ENDPOINTS.USERS, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: string): Promise<void> {
  await apiRequest<void>(`${API_ENDPOINTS.USERS}/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  await apiRequest<void>(`${API_ENDPOINTS.USERS}/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User> {
  return await apiRequest<User>(`${API_ENDPOINTS.USERS}/${userId}`);
}
