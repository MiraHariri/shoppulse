/**
 * QuickSight Embed Types
 * ShopPulse Analytics - Dashboard Embedding
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
 * Governance rule from database
 */
export interface GovernanceRule {
  dimension: string;
  values: string[];
}

/**
 * QuickSight session tag
 */
export interface SessionTag {
  Key: string;
  Value: string;
}

/**
 * API Gateway Lambda event
 */
export interface APIGatewayEvent {
  body: string | null;
  headers?: { [key: string]: string };
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  httpMethod?: string;
  resource?: string;
  path?: string;
  routeKey?: string;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;
        email: string;
        'custom:tenant_id': string;
        'custom:role': string;
      };
    };
    http?: {
      method: string;
    };
    httpMethod?: string;
    resourcePath?: string;
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
  retryable?: boolean;
}

/**
 * Embed URL response
 */
export interface EmbedUrlResponse {
  embedUrl: string;
  expiresIn: number;
}
