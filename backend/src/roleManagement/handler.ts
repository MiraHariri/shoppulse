/**
 * Role Management Lambda Handler
 * Manages roles and their metric visibility
 */

import { query, withTransaction } from "../shared/db";
import {
  APIGatewayEvent,
  LambdaResponse,
  RequestContext,
  ErrorResponse,
} from "../userManagement/types";

interface RoleMetric {
  id: number;
  tenant_id: string;
  role: string;
  metric_name: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateRoleRequest {
  role: string;
  metrics: string[];
}

interface UpdateRoleMetricsRequest {
  metrics: string[];
}

/**
 * Extracts request context from API Gateway event
 */
function getRequestContext(event: APIGatewayEvent): RequestContext {
  try {
    if (!event.requestContext?.authorizer) {
      throw new Error("No authorizer found in request context");
    }

    const claims = event.requestContext.authorizer.claims;

    if (!claims) {
      throw new Error("No claims found in authorizer");
    }

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
    throw new Error("User not found or inactive");
  }

  if (!result.rows[0].is_tenant_admin) {
    throw new Error("Insufficient permissions: Admin role required");
  }
}

/**
 * Lists all roles with their metrics for the tenant
 * GET /roles
 */
export async function listRoles(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);

    // Get all role metrics for this tenant
    const result = await query<RoleMetric>(
      `SELECT id, tenant_id, role, metric_name, is_visible, created_at, updated_at
       FROM role_metric_visibility
       WHERE tenant_id = $1
       ORDER BY role, metric_name`,
      [context.tenantId],
    );

    // Group by role
    const roleMap = new Map<string, RoleMetric[]>();
    result.rows.forEach((metric) => {
      if (!roleMap.has(metric.role)) {
        roleMap.set(metric.role, []);
      }
      roleMap.get(metric.role)!.push(metric);
    });

    const roles = Array.from(roleMap.entries()).map(([role, metrics]) => ({
      role,
      metrics: metrics.map((m) => ({
        id: m.id,
        metric_name: m.metric_name,
        is_visible: m.is_visible,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
    }));

    return successResponse(200, { roles, count: roles.length });
  } catch (error: any) {
    console.error("Error listing roles:", error);
    return errorResponse(500, "Failed to list roles", undefined, true);
  }
}

/**
 * Gets metrics for a specific role
 * GET /roles/{role}
 */
export async function getRole(event: APIGatewayEvent): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const role = event.pathParameters?.role;

    if (!role) {
      return errorResponse(400, "Role is required");
    }

    const result = await query<RoleMetric>(
      `SELECT id, tenant_id, role, metric_name, is_visible, created_at, updated_at
       FROM role_metric_visibility
       WHERE tenant_id = $1 AND role = $2
       ORDER BY metric_name`,
      [context.tenantId, role],
    );

    return successResponse(200, {
      role,
      metrics: result.rows.map((m) => ({
        id: m.id,
        metric_name: m.metric_name,
        is_visible: m.is_visible,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error("Error getting role:", error);
    return errorResponse(500, "Failed to get role", undefined, true);
  }
}

/**
 * Creates a new role with metrics
 * POST /roles
 * Creates all 4 metrics, setting is_visible=true for provided metrics and is_visible=false for others
 */
export async function createRole(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    if (!event.body) {
      return errorResponse(400, "Request body is required");
    }

    const requestData: CreateRoleRequest = JSON.parse(event.body);

    if (!requestData.role || !requestData.role.trim()) {
      return errorResponse(400, "Role name is required", "role");
    }

    if (!requestData.metrics || requestData.metrics.length === 0) {
      return errorResponse(
        400,
        "At least one metric is required",
        "metrics",
      );
    }

    // Check if role already exists
    const existingRole = await query<RoleMetric>(
      "SELECT id FROM role_metric_visibility WHERE tenant_id = $1 AND role = $2 LIMIT 1",
      [context.tenantId, requestData.role],
    );

    if (existingRole.rows.length > 0) {
      return errorResponse(400, "Role already exists", "role");
    }

    // Create role with all metrics, setting is_visible based on provided metrics
    const createdMetrics = await withTransaction(async (client) => {
      const metrics: RoleMetric[] = [];

      for (const metricName of requestData.metrics) {
        const isVisible = requestData.metrics.includes(metricName);
        const result = await client.query<RoleMetric>(
          `INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible)
           VALUES ($1, $2, $3, $4)
           RETURNING id, tenant_id, role, metric_name, is_visible, created_at, updated_at`,
          [context.tenantId, requestData.role, metricName, isVisible],
        );
        metrics.push(result.rows[0]);
      }

      return metrics;
    });

    console.log(
      `Role created: ${requestData.role} with ${createdMetrics.length} metrics (${requestData.metrics.length} visible) in tenant ${context.tenantId}`,
    );

    return successResponse(201, {
      role: requestData.role,
      metrics: createdMetrics.map((m) => ({
        id: m.id,
        metric_name: m.metric_name,
        is_visible: m.is_visible,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Error creating role:", error);
    return errorResponse(500, "Failed to create role", undefined, true);
  }
}

/**
 * Adds metrics to an existing role (sets is_visible to true)
 * POST /roles/{role}/metrics
 */
export async function addMetricsToRole(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const role = event.pathParameters?.role;

    if (!role) {
      return errorResponse(400, "Role is required");
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    if (!event.body) {
      return errorResponse(400, "Request body is required");
    }

    const requestData: UpdateRoleMetricsRequest = JSON.parse(event.body);

    if (!requestData.metrics || requestData.metrics.length === 0) {
      return errorResponse(
        400,
        "At least one metric is required",
        "metrics",
      );
    }

    // Update metrics to set is_visible = true
    const updatedMetrics = await withTransaction(async (client) => {
      const metrics: RoleMetric[] = [];

      for (const metricName of requestData.metrics) {
        // Check if metric already exists
        const existing = await client.query<RoleMetric>(
          "SELECT id, is_visible FROM role_metric_visibility WHERE tenant_id = $1 AND role = $2 AND metric_name = $3",
          [context.tenantId, role, metricName],
        );

        if (existing.rows.length === 0) {
          // Insert new metric with is_visible = true
          const result = await client.query<RoleMetric>(
            `INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible)
             VALUES ($1, $2, $3, $4)
             RETURNING id, tenant_id, role, metric_name, is_visible, created_at, updated_at`,
            [context.tenantId, role, metricName, true],
          );
          metrics.push(result.rows[0]);
        } else if (!existing.rows[0].is_visible) {
          // Update existing metric to set is_visible = true
          const result = await client.query<RoleMetric>(
            `UPDATE role_metric_visibility 
             SET is_visible = true, updated_at = NOW()
             WHERE tenant_id = $1 AND role = $2 AND metric_name = $3
             RETURNING id, tenant_id, role, metric_name, is_visible, created_at, updated_at`,
            [context.tenantId, role, metricName],
          );
          metrics.push(result.rows[0]);
        }
      }

      return metrics;
    });

    console.log(
      `Metrics visibility updated for role ${role}: ${updatedMetrics.length} metrics set to visible in tenant ${context.tenantId}`,
    );

    return successResponse(200, {
      role,
      added: updatedMetrics.map((m) => ({
        id: m.id,
        metric_name: m.metric_name,
        is_visible: m.is_visible,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Error adding metrics to role:", error);
    return errorResponse(500, "Failed to add metrics", undefined, true);
  }
}

/**
 * Removes a metric from a role (sets is_visible to false)
 * DELETE /roles/{role}/metrics/{metricName}
 */
export async function removeMetricFromRole(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const role = event.pathParameters?.role;
    const metricName = event.pathParameters?.metricName;

    if (!role) {
      return errorResponse(400, "Role is required");
    }

    if (!metricName) {
      return errorResponse(400, "Metric name is required");
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    // Update metric to set is_visible = false instead of deleting
    const result = await query(
      "UPDATE role_metric_visibility SET is_visible = false, updated_at = NOW() WHERE tenant_id = $1 AND role = $2 AND metric_name = $3",
      [context.tenantId, role, metricName],
    );

    if (result.rowCount === 0) {
      return errorResponse(404, "Metric not found for this role");
    }

    console.log(
      `Metric visibility set to false for role ${role}: ${metricName} in tenant ${context.tenantId}`,
    );

    return successResponse(200, {
      success: true,
      role,
      metric_name: metricName,
    });
  } catch (error: any) {
    console.error("Error removing metric from role:", error);
    return errorResponse(500, "Failed to remove metric", undefined, true);
  }
}

/**
 * Deletes a role and all its metrics
 * DELETE /roles/{role}
 */
export async function deleteRole(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    const context = getRequestContext(event);
    const role = event.pathParameters?.role;

    if (!role) {
      return errorResponse(400, "Role is required");
    }

    // Validate admin permissions
    try {
      await validateTenantAdmin(context.userId, context.tenantId);
    } catch (error: any) {
      return errorResponse(403, error.message);
    }

    // Check if any users have this role
    const usersWithRole = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role = $2 AND status = $3",
      [context.tenantId, role, "Active"],
    );

    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return errorResponse(
        400,
        "Cannot delete role that is assigned to active users",
      );
    }

    // Delete all metrics for this role
    const result = await query(
      "DELETE FROM role_metric_visibility WHERE tenant_id = $1 AND role = $2",
      [context.tenantId, role],
    );

    if (result.rowCount === 0) {
      return errorResponse(404, "Role not found");
    }

    console.log(
      `Role deleted: ${role} (${result.rowCount} metrics) in tenant ${context.tenantId}`,
    );

    return successResponse(200, {
      success: true,
      role,
      metrics_deleted: result.rowCount,
    });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return errorResponse(500, "Failed to delete role", undefined, true);
  }
}
