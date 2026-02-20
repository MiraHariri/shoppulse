import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import type { UserRole } from '../utils/constants';

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthUser> {
  const { isSignedIn, nextStep } = await signIn({
    username: credentials.email,
    password: credentials.password,
  });
  
  if (!isSignedIn) {
    throw new Error(`Sign in incomplete: ${nextStep.signInStep}`);
  }
  
  return await getCurrentAuthUser();
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<AuthUser> {
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
  };
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}
