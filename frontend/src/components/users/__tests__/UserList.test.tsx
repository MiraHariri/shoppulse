import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserList from '../UserList';
import authReducer from '../../../store/authSlice';
import userReducer from '../../../store/userSlice';
import { USER_ROLES, USER_STATUS } from '../../../utils/constants';
import type { User } from '../../../types/user.types';

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock the apiClient to prevent actual API calls
vi.mock('../../../utils/apiClient', () => ({
  apiRequest: vi.fn(),
}));

const { useAuth } = await import('../../../hooks/useAuth');

describe('UserList Component', () => {
  const mockUsers: User[] = [
    {
      user_id: 'user-1',
      email: 'user1@example.com',
      role: USER_ROLES.FINANCE,
      status: USER_STATUS.ACTIVE,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      user_id: 'user-2',
      email: 'user2@example.com',
      role: USER_ROLES.OPERATIONS,
      status: USER_STATUS.ACTIVE,
      created_at: '2024-01-16T10:00:00Z',
    },
  ];

  const createMockStore = (users: User[] = [], loading = false, error: string | null = null) => {
    return configureStore({
      reducer: {
        auth: authReducer,
        users: userReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            tenantId: 'tenant-123',
            role: USER_ROLES.ADMIN,
          },
          loading: false,
          error: null,
          requiresPasswordChange: false,
          tempCredentials: null,
        },
        users: {
          users,
          loading,
          error,
        },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display access denied for non-admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.FINANCE,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Admin role required to access user management.')).toBeInTheDocument();
  });

  it('should display user table for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore(mockUsers);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
  });

  it('should display loading state when fetching users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore([], true);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore([], false, 'Failed to fetch users');
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
  });

  it('should display "Add User" button for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore(mockUsers);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    const addButton = screen.getByText('Add User');
    expect(addButton).toBeInTheDocument();
    expect(addButton).not.toBeDisabled();
  });

  it('should display role badges with correct styling', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore(mockUsers);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    const financeBadge = screen.getByText(USER_ROLES.FINANCE);
    const operationsBadge = screen.getByText(USER_ROLES.OPERATIONS);

    expect(financeBadge).toHaveClass('role-badge', 'role-finance');
    expect(operationsBadge).toHaveClass('role-badge', 'role-operations');
  });

  it('should display status badges with correct styling', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore(mockUsers);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    const statusBadges = screen.getAllByText(USER_STATUS.ACTIVE);
    statusBadges.forEach((badge) => {
      expect(badge).toHaveClass('status-badge', 'status-active');
    });
  });

  it('should display empty state when no users exist', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        role: USER_ROLES.ADMIN,
      },
      loading: false,
      error: null,
      requiresPasswordChange: false,
      tempCredentials: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      clearPasswordChangeState: vi.fn(),
      isAuthenticated: true,
    });

    const store = createMockStore([]);
    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('No users found. Click "Add User" to create one.')).toBeInTheDocument();
  });
});
