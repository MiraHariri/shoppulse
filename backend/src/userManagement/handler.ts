/**
 * User Management Lambda Handler
 * Implements user CRUD operations with tenant isolation
 */

import { query, withTransaction } from "../shared/db";
import {
  createCognitoUser,
  updateCognitoUserRole,
  deleteCognitoUser,
} from "./cognito";
import {
  validateCreateUserRequest,
  validateUpdateRoleRequest,
  isValidEmail,
} from "./validation";
import {
  APIGatewayEvent,
  LambdaResponse,
  RequestContext,
  CreateUserRequest,
  UpdateUserRoleRequest,
  User,
  ErrorResponse,
  CreateUserResponse,
  ListUsersResponse,
} from "./types";

/**
 * Extracts request context from API Gateway event
 */
function getRequestContext(event: APIGatewayEvent): RequestContext {
  try {
    // Log the event structure for debugging
    console.log(
      "Event structure:",
      JSON.stringify(
        {
          requestContext: event.requestContext,
          headers: event.headers,
          pathParameters: event.pathParameters,
        },
        null,
        2,
      ),
    );

    // Check if authorizer exists
    if (!event.requestContext?.authorizer) {
      throw new Error("No authorizer found in request context");
    }

    const claims = event.requestContext.authorizer.claims;

    if (!claims) {
      throw new Error("No claims found in authorizer");
    }

    // Validate required claims
    if (!claims["custom:tenant_id"]) {
      throw new Error("Missing custom:tenant_id claim");
    }

    if (!claims.sub) {
      throw new Error("Missing sub claim");
    }

    return {
      tenantId: claims["custom:tenant_id"],
      userId: claims.sub,
      userRole: claims["custom:role"] || "Finance",
      email: claims.email || "",
    };
  } catch (error) {
    console.error("Error extracting request context:", error);
    throw error;
  }
}

/**
 * Creates a success response
 */
function successResponse(statusCode: number, data: any): LambdaResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
}

/**
 * Creates an error response
 */
function errorResponse(
  statusCode: number,
  error: string,
  field?: string,
  retryable?: boolean,
): LambdaResponse {
  const errorBody: ErrorResponse = { error, field, retryable };
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(errorBody),
  };
}

/**
 * Validates that the requesting user is a tenant admin
 */
async function validateTenantAdmin(
  cognitoUserId: string,
  tenantId: string,
): Promise<void> {
  const result = await query<{ is_tenant_admin: boolean }>(
    "SELECT is_tenant_admin FROM users WHERE cognito_user_id = $1 AND tenant_id = $2 AND status = $3",
    [cognitoUserId, tenantId, "Active"],
  );

  if (result.rows.length === 0) {
    console.error(
      `User validation failed: cognito_user_id=${cognitoUserId}, tenant_id=${tenantId}`,
    );
    throw new Error(
      "User not found or inactive. Please ensure your user account exists in the database.",
    );
  }

  if (!result.rows[0].is_tenant_admin) {
    throw new Error("Insufficient permissions: Admin role required");
  }
}

/**
 * Validates that a user belongs to the specified tenant
 */
async function validateUserTenant(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await query<{ tenant_id: string }>(
    "SELECT tenant_id FROM users WHERE user_id = $1",
    [userId],
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].tenant_id === tenantId;
}

/**
 * Creates a new user
 * POST /users
 */
export async function createUser(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);

    // Parse request body
    if (!event.body) {
      return errorResponse(400, "Request body is required");
    }

    const requestData: CreateUserRequest = JSON.parse(event.body);

    // Validate request
    const validation = validateCreateUserRequest(requestData);
    if (!validation.valid) {
      return errorResponse(400, validation.error!, validation.field);
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    // Check if user already exists in this tenant
    const existingUser = await query<User>(
      "SELECT user_id FROM users WHERE email = $1 AND tenant_id = $2",
      [requestData.email, context.tenantId],
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(400, "User with this email already exists", "email");
    }

    // Create user in Cognito and PostgreSQL within a transaction
    const result = await withTransaction(async (client) => {
      // Create user in Cognito
      const cognitoUserId = await createCognitoUser(
        requestData.email,
        requestData.password,
        context.tenantId,
        requestData.role,
      );

      // Generate user_id - dynamically determine padding based on existing IDs
      const userIdResult = await client.query<{ user_id: string }>(
        `SELECT 'U' || LPAD(
          (COALESCE(MAX(SUBSTRING(user_id FROM 2)::INTEGER), 0) + 1)::TEXT, 
          GREATEST(LENGTH(COALESCE(MAX(SUBSTRING(user_id FROM 2)), '000')), 3),
          '0'
        ) AS user_id 
         FROM users WHERE tenant_id = $1`,
        [context.tenantId],
      );
      const userId = userIdResult.rows[0]?.user_id || "U001";

      // Insert into PostgreSQL and return created_at
      const insertResult = await client.query<{ created_at: string }>(
        `INSERT INTO users (user_id, tenant_id, email, cognito_user_id, role, region, store_id, is_tenant_admin, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING created_at`,
        [
          userId,
          context.tenantId,
          requestData.email,
          cognitoUserId,
          requestData.role,
          requestData.region || null,
          requestData.store_id || null,
          requestData.is_tenant_admin || false,
          "Active",
        ],
      );

      return {
        user_id: userId,
        email: requestData.email,
        role: requestData.role,
        status: "Active" as const,
        created_at: insertResult.rows[0].created_at,
      };
    });

    const response: CreateUserResponse = {
      user_id: result.user_id,
      email: result.email,
      role: result.role,
      status: result.status,
      created_at: result.created_at,
    };

    console.log(`User created: ${result.user_id} in tenant ${context.tenantId}`);
    return successResponse(201, response);
  } catch (error: any) {
    console.error("Error creating user:", error);

    if (error.message.includes("already exists")) {
      return errorResponse(400, error.message, "email");
    }

    return errorResponse(500, "Failed to create user", undefined, true);
  }
}

/**
 * Lists all users for the tenant
 * GET /users
 */
export async function listUsers(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    console.log("listUsers: Starting request");
    const context = getRequestContext(event);
    console.log("listUsers: Context extracted", {
      tenantId: context.tenantId,
      userId: context.userId,
    });

    // Query users for this tenant only
    const result = await query<User>(
      `SELECT user_id, tenant_id, email, role, region, store_id, is_tenant_admin, status, created_at
       FROM users
       WHERE tenant_id = $1 AND status != $2
       ORDER BY created_at DESC`,
      [context.tenantId, "Deleted"],
    );

    console.log("listUsers: Query successful", { count: result.rowCount });

    const response: ListUsersResponse = {
      users: result.rows,
      count: result.rowCount,
    };

    return successResponse(200, response);
  } catch (error: any) {
    console.error("Error listing users:", error);
    console.error("Error stack:", error.stack);

    // Check if it's an authorization error
    if (
      error.message?.includes("authorizer") ||
      error.message?.includes("claims")
    ) {
      return errorResponse(401, "Unauthorized: " + error.message);
    }

    return errorResponse(
      500,
      "Failed to list users: " + error.message,
      undefined,
      true,
    );
  }
}

/**
 * Gets a specific user by ID
 * GET /users/{userId}
 */
export async function getUser(event: APIGatewayEvent): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, "User ID is required");
    }

    // Validate tenant ownership
    const isValidTenant = await validateUserTenant(userId, context.tenantId);
    if (!isValidTenant) {
      return errorResponse(
        403,
        "Access denied: resource belongs to different tenant",
      );
    }

    // Get user details
    const result = await query<User>(
      `SELECT user_id, tenant_id, email, role, region, store_id, is_tenant_admin, status, created_at
       FROM users
       WHERE user_id = $1 AND tenant_id = $2 AND status != $3`,
      [userId, context.tenantId, "Deleted"],
    );

    if (result.rows.length === 0) {
      return errorResponse(404, "User not found");
    }

    return successResponse(200, result.rows[0]);
  } catch (error: any) {
    console.error("Error getting user:", error);
    return errorResponse(500, "Failed to get user", undefined, true);
  }
}

/**
 * Updates user role
 * PUT /users/{userId}/role
 */
export async function updateUserRole(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, "User ID is required");
    }

    // Parse request body
    if (!event.body) {
      return errorResponse(400, "Request body is required");
    }

    const requestData: UpdateUserRoleRequest = JSON.parse(event.body);

    // Validate request
    const validation = validateUpdateRoleRequest(requestData);
    if (!validation.valid) {
      return errorResponse(400, validation.error!, validation.field);
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    // Validate tenant ownership
    const isValidTenant = await validateUserTenant(userId, context.tenantId);
    if (!isValidTenant) {
      return errorResponse(
        403,
        "Access denied: resource belongs to different tenant",
      );
    }

    // Update role in both Cognito and PostgreSQL
    await withTransaction(async (client) => {
      // Get user's Cognito ID
      const userResult = await client.query<{
        cognito_user_id: string;
        email: string;
      }>(
        "SELECT cognito_user_id, email FROM users WHERE user_id = $1 AND tenant_id = $2",
        [userId, context.tenantId],
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const cognitoUserId = userResult.rows[0].cognito_user_id;

      // Update Cognito
      await updateCognitoUserRole(cognitoUserId, requestData.role);

      // Update PostgreSQL
      await client.query(
        "UPDATE users SET role = $1 WHERE user_id = $2 AND tenant_id = $3",
        [requestData.role, userId, context.tenantId],
      );
    });

    console.log(
      `User role updated: ${userId} to ${requestData.role} in tenant ${context.tenantId}`,
    );
    return successResponse(200, {
      success: true,
      userId,
      role: requestData.role,
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);

    if (error.message === "User not found") {
      return errorResponse(404, error.message);
    }

    return errorResponse(500, "Failed to update user role", undefined, true);
  }
}

/**
 * Deletes a user (marks as deleted in DB and removes from Cognito)
 * DELETE /users/{userId}
 */
export async function deleteUser(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, "User ID is required");
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    // Validate tenant ownership
    const isValidTenant = await validateUserTenant(userId, context.tenantId);
    if (!isValidTenant) {
      return errorResponse(
        403,
        "Access denied: resource belongs to different tenant",
      );
    }

    // Prevent self-deletion
    if (userId === context.userId) {
      return errorResponse(400, "Cannot delete your own account");
    }

    // Delete from both Cognito and PostgreSQL
    await withTransaction(async (client) => {
      // Get user's Cognito ID
      const userResult = await client.query<{
        cognito_user_id: string;
        email: string;
      }>(
        "SELECT cognito_user_id, email FROM users WHERE user_id = $1 AND tenant_id = $2 AND status != $3",
        [userId, context.tenantId, "Deleted"],
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const cognitoUserId = userResult.rows[0].cognito_user_id;

      // Delete from Cognito
      await deleteCognitoUser(cognitoUserId);

      // Mark as deleted in PostgreSQL (soft delete)
      await client.query(
        "UPDATE users SET status = $1 WHERE user_id = $2 AND tenant_id = $3",
        ["Deleted", userId, context.tenantId],
      );
    });

    console.log(`User deleted: ${userId} from tenant ${context.tenantId}`);
    return successResponse(200, { success: true, userId });
  } catch (error: any) {
    console.error("Error deleting user:", error);

    if (error.message === "User not found") {
      return errorResponse(404, error.message);
    }

    return errorResponse(500, "Failed to delete user", undefined, true);
  }
}
