import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { checkAuth, login, logout, changePassword, clearPasswordChangeState } from '../store/authSlice';
import type { LoginCredentials, ChangePasswordData } from '../types/auth.types';

/**
 * Custom hook for authentication
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error, requiresPasswordChange, tempCredentials } = useSelector(
    (state: RootState) => state.auth
  );
  
  const handleLogin = async (credentials: LoginCredentials) => {
    await dispatch(login(credentials)).unwrap();
  };
  
  const handleLogout = async () => {
    await dispatch(logout()).unwrap();
  };
  
  const handleChangePassword = async (data: ChangePasswordData) => {
    await dispatch(changePassword(data)).unwrap();
  };
  
  const handleClearPasswordChangeState = () => {
    dispatch(clearPasswordChangeState());
  };
  
  return {
    user,
    loading,
    error,
    requiresPasswordChange,
    tempCredentials,
    login: handleLogin,
    logout: handleLogout,
    changePassword: handleChangePassword,
    clearPasswordChangeState: handleClearPasswordChangeState,
    isAuthenticated: !!user,
  };
};

/**
 * Hook to initialize auth check - should only be used once at app level
 */
export const useAuthInit = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
};
