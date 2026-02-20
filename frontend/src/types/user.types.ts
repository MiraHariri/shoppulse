import type { UserRole, UserStatus } from '../utils/constants';

export interface User {
  user_id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRoleData {
  role: UserRole;
}

export interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}
