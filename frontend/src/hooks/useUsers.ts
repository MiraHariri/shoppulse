import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchUsers, createUser, updateUserRole, deleteUser } from '../store/userSlice';
import type { CreateUserData } from '../types/user.types';

/**
 * Custom hook for user management
 */
export const useUsers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { users, loading, error } = useSelector((state: RootState) => state.users);
  
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);
  
  const handleCreateUser = async (userData: CreateUserData) => {
    await dispatch(createUser(userData)).unwrap();
  };
  
  const handleUpdateUserRole = async (userId: string, role: string) => {
    await dispatch(updateUserRole({ userId, role })).unwrap();
  };
  
  const handleDeleteUser = async (userId: string) => {
    await dispatch(deleteUser(userId)).unwrap();
  };
  
  const refreshUsers = () => {
    dispatch(fetchUsers());
  };
  
  return {
    users,
    loading,
    error,
    createUser: handleCreateUser,
    updateUserRole: handleUpdateUserRole,
    deleteUser: handleDeleteUser,
    refreshUsers,
  };
};
