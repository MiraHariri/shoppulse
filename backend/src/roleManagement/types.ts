/**
 * Type definitions for Role Management
 */

export interface APIGatewayEvent {
  body: string | null;
  pathParameters: { [key: string]: string } | null;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        "custom:tenant_id": string;
        "custom:role": string;
      };
    };
  };
}

export interface LambdaResponse {
  statusCode: number;
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
  };
  body: string;
}

export interface RequestContext {
  tenantId: string;
  userId: string;
  userRole: string;
  email: string;
}

export interface CreateRoleRequest {
  role: string;
  metrics: string[];
}

export interface AddMetricsRequest {
  metrics: string[];
}

export interface Role {
  role: string;
  metrics: string[];
}

export interface ErrorResponse {
  error: string;
  field?: string;
  retryable?: boolean;
}
