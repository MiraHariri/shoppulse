import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { signIn, signOut, fetchAuthSession, getCurrentUser, confirmSignIn } from 'aws-amplify/auth';
import type { AuthUser, LoginCredentials, AuthState, ChangePasswordData } from '../types/auth.types';
import type { UserRole } from '../utils/constants';

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  requiresPasswordChange: false,
  tempCredentials: null,
};

/**
 * Check if user is authenticated and get user data
 */
export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const currentUser = await getCurrentUser();
  const session = await fetchAuthSession();
  
  const attributes = currentUser.signInDetails?.loginId;
  const idToken = session.tokens?.idToken;
  
  if (!idToken) {
    throw new Error('No ID token available');
  }
  
  const payload = idToken.payload;
  
  return {
    id: currentUser.userId,
    email: (payload.email as string) || attributes || '',
    tenantId: (payload['custom:tenant_id'] as string) || '',
    role: (payload['custom:role'] as UserRole) || 'Finance',
  } as AuthUser;
});

/**
 * Login user with email and password
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    const { isSignedIn, nextStep } = await signIn({
      username: credentials.email,
      password: credentials.password,
    });
    
    // Handle force change password flow
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return rejectWithValue({
        requiresPasswordChange: true,
        credentials,
      });
    }
    
    if (!isSignedIn) {
      throw new Error(`Sign in incomplete: ${nextStep.signInStep}`);
    }
    
    // Get user attributes after successful sign in
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token available');
    }
    
    const payload = idToken.payload;
    
    return {
      id: currentUser.userId,
      email: (payload.email as string) || credentials.email,
      tenantId: (payload['custom:tenant_id'] as string) || '',
      role: (payload['custom:role'] as UserRole) || 'Finance',
    } as AuthUser;
  }
);

/**
 * Change password for new user (force change password flow)
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordData) => {
    // Complete the sign-in with new password
    const { isSignedIn } = await confirmSignIn({
      challengeResponse: data.newPassword,
    });
    
    if (!isSignedIn) {
      throw new Error('Password change failed');
    }
    
    // Get user attributes after password change
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token available');
    }
    
    const payload = idToken.payload;
    
    return {
      id: currentUser.userId,
      email: (payload.email as string) || '',
      tenantId: (payload['custom:tenant_id'] as string) || '',
      role: (payload['custom:role'] as UserRole) || 'Finance',
    } as AuthUser;
  }
);

/**
 * Logout user
 */
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPasswordChangeState: (state) => {
      state.requiresPasswordChange = false;
      state.tempCredentials = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null; // Don't show error for initial auth check
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.requiresPasswordChange = false;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
        state.requiresPasswordChange = false;
        state.tempCredentials = null;
      })
      .addCase(login.rejected, (state, action) => {
        // Check if rejection is due to password change requirement
        const payload = action.payload as { requiresPasswordChange?: boolean; credentials?: LoginCredentials } | undefined;
        if (payload?.requiresPasswordChange && payload.credentials) {
          state.requiresPasswordChange = true;
          state.tempCredentials = payload.credentials;
          state.error = null;
        } else {
          state.error = action.error.message || 'Login failed';
        }
        state.loading = false;
      })
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
        state.requiresPasswordChange = false;
        state.tempCredentials = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.error.message || 'Password change failed';
        state.loading = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
        state.requiresPasswordChange = false;
        state.tempCredentials = null;
      });
  },
});

export const { clearError, clearPasswordChangeState } = authSlice.actions;
export default authSlice.reducer;
