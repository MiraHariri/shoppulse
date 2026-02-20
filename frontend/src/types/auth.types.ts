import type { UserRole } from '../utils/constants';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  newPassword: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  tempCredentials: LoginCredentials | null;
}
