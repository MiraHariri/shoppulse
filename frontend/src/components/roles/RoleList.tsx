/* eslint-disable no-useless-catch */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Alert, CircularProgress, Typography } from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import type { RootState, AppDispatch } from '../../store';
import { fetchRoles, createRole, clearError } from '../../store/roleSlice';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import type { CreateRoleData } from '../../types/role.types';
import RoleForm from './RoleForm';
import RoleCard from './RoleCard';

/**
 * RoleList component - Displays role cards with metrics
 * Only accessible to Admin users
 */
export default function RoleList() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { roles = [], loading, error } = useSelector((state: RootState) => state.roles);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);

  useEffect(() => {
    // Fetch roles when component mounts
    if (user?.role === USER_ROLES.ADMIN) {
      dispatch(fetchRoles());
    }
  }, [dispatch, user?.role]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    dispatch(fetchRoles());
  };
  
  /**
   * Handle role creation
   */
  const handleCreateRole = async (roleData: CreateRoleData) => {
    try {
      await dispatch(createRole(roleData)).unwrap();
      setShowAddRoleForm(false);
      // Success - role will be added to the list automatically by Redux
    } catch (error) {
      // Error is handled by Redux and displayed in the form
      throw error;
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancelForm = () => {
    setShowAddRoleForm(false);
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
          Admin role required to access role management.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: { xs: 2, sm: 3 },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Roles & Metrics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddRoleForm(true)}
            disabled={loading}
            size="small"
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            Add Role
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && roles.length === 0 && !error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : roles.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No roles found. Click "Add Role" to create one.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            lg: 'repeat(3, 1fr)' 
          }, 
          gap: 2 
        }}>
          {roles.map((role) => (
            <RoleCard key={role.role} role={role} loading={loading} />
          ))}
        </Box>
      )}

      {showAddRoleForm && (
        <RoleForm onSubmit={handleCreateRole} onCancel={handleCancelForm} />
      )}
    </Box>
  );
}
