/* eslint-disable no-useless-catch */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Alert, CircularProgress, Typography } from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import type { RootState, AppDispatch } from '../../store';
import { fetchUsers, createUser, clearError } from '../../store/userSlice';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import type { CreateUserData } from '../../types/user.types';
import UserForm from './UserForm';
import UserTable from './UserTable';

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
   * Handle refresh button click
   */
  const handleRefresh = () => {
    dispatch(fetchUsers());
  };
  
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user.role !== USER_ROLES.ADMIN) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Admin role required to access user management.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Users
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddUserForm(true)}
            disabled={loading}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && users.length === 0 && !error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <UserTable users={users} loading={loading} />
      )}

      {showAddUserForm && (
        <UserForm onSubmit={handleCreateUser} onCancel={handleCancelForm} />
      )}
    </Box>
  );
}
