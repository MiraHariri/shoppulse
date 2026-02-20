/**
 * User Management Types
 * ShopPulse Analytics - Multi-tenant User Management
 */

/**
 * Request context from API Gateway with Cognito authorizer
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  userRole: string;
  email: string;
}

/**
 * User data structure from database
 */
export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  cognito_user_id: string;
  role: 'Admin' | 'Finance' | 'Operations' | 'Marketing';
  region?: string;
  store_id?: string;
  is_tenant_admin: boolean;
  status: 'Active' | 'Inactive' | 'Deleted';
  created_at: Date;
}

/**
 * Create user request body
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
  region?: string;
  store_id?: string;
  is_tenant_admin?: boolean;
}

/**
 * Update user role request body
 */
export interface UpdateUserRoleRequest {
  role: string;
}

/**
 * API Gateway Lambda event
 */
export interface APIGatewayEvent {
  body: string | null;
  pathParameters: { [key: string]: string } | null;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        'custom:tenant_id': string;
        'custom:role': string;
      };
    };
  };
}

/**
 * Lambda response
 */
export interface LambdaResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

/**
 * Error response body
 */
export interface ErrorResponse {
  error: string;
  field?: string;
  retryable?: boolean;
}

/**
 * Success response for user creation
 */
export interface CreateUserResponse {
  userId: string;
  email: string;
  role: string;
}

/**
 * List users response
 */
export interface ListUsersResponse {
  users: User[];
  count: number;
}
