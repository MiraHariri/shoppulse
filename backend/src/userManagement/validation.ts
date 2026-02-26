/**
 * Validation utilities for user management
 */

/**
 * Valid user roles
 */
const VALID_ROLES = ['Admin', 'Finance', 'Operations', 'Marketing'] as const;

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validates email format
 * 
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates password strength
 * 
 * @param password - Password to validate
 * @returns True if valid, false otherwise
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return PASSWORD_REGEX.test(password);
}

/**
 * Validates required fields for user creation
 * 
 * @param data - User data to validate
 * @returns Validation result with error message if invalid
 */
export function validateCreateUserRequest(data: any): { valid: boolean; error?: string; field?: string } {
  if (!data) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!data.email) {
    return { valid: false, error: 'Email is required', field: 'email' };
  }

  if (!isValidEmail(data.email)) {
    return { valid: false, error: 'Invalid email format', field: 'email' };
  }

  if (!data.password) {
    return { valid: false, error: 'Password is required', field: 'password' };
  }

  if (!isValidPassword(data.password)) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      field: 'password',
    };
  }

  if (!data.role) {
    return { valid: false, error: 'Role is required', field: 'role' };
  }

  return { valid: true };
}

/**
 * Validates update role request
 * 
 * @param data - Role update data to validate
 * @returns Validation result with error message if invalid
 */
export function validateUpdateRoleRequest(data: any): { valid: boolean; error?: string; field?: string } {
  if (!data) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!data.role) {
    return { valid: false, error: 'Role is required', field: 'role' };
  }

  return { valid: true };
}

/**
 * Sanitizes string input to prevent SQL injection
 * Note: This is a defense-in-depth measure. Always use parameterized queries.
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // Remove any SQL-like patterns (defense in depth)
  return input.trim().replace(/[;'"\\]/g, '');
}
