import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchUsers, createUser, clearError } from '../../store/userSlice';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import type { CreateUserData } from '../../types/user.types';
import UserForm from './UserForm';
import UserTable from './UserTable';
import './UserList.css';

/**
 * UserList component - Displays user table with role and status
 * Only accessible to Admin users
 * Requirements: 9.1, 9.4
 */
export default function UserList() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { users = [], loading, error } = useSelector((state: RootState) => state.users);
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  useEffect(() => {
    // Fetch users when component mounts
    if (user?.role === USER_ROLES.ADMIN) {
      dispatch(fetchUsers());
    }
  }, [dispatch, user?.role]);

  /**
   * Handle user creation
   */
  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      await dispatch(createUser(userData)).unwrap();
      setShowAddUserForm(false);
      // Success - user will be added to the list automatically by Redux
    } catch (error) {
      // Error is handled by Redux and displayed in the form
      throw error;
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancelForm = () => {
    setShowAddUserForm(false);
    dispatch(clearError());
  };

  // Check if user has admin access
  if (!user) {
    return (
      <div className="user-list-container">
        <div className="access-denied">
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (user.role !== USER_ROLES.ADMIN) {
    return (
      <div className="user-list-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Admin role required to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h1>User Management</h1>
        <button
          className="btn-primary"
          onClick={() => setShowAddUserForm(true)}
          disabled={loading}
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading && users.length === 0 && !error ? (
        <div className="loading-state">
          <p>Loading users...</p>
        </div>
      ) : (
        <UserTable users={users} loading={loading} />
      )}

      {showAddUserForm && (
        <UserForm onSubmit={handleCreateUser} onCancel={handleCancelForm} />
      )}
    </div>
  );
}
