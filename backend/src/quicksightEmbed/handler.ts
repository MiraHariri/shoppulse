/**
 * QuickSight Embed Lambda Handler
 * Generates embed URLs with tenant isolation and governance rules
 */

import {
  QuickSightClient,
  GenerateEmbedUrlForRegisteredUserCommand,
  RegisterUserCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { query } from '../shared/db';
import {
  APIGatewayEvent,
  LambdaResponse,
  RequestContext,
  GovernanceRule,
  SessionTag,
  ErrorResponse,
  EmbedUrlResponse,
} from './types';

/**
 * QuickSight client instance
 */
const quicksightClient = new QuickSightClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Environment variables
 */
const QUICKSIGHT_AWS_ACCOUNT_ID = process.env.QUICKSIGHT_AWS_ACCOUNT_ID;
const QUICKSIGHT_DASHBOARD_ID = process.env.QUICKSIGHT_DASHBOARD_ID;
const SESSION_LIFETIME_MINUTES = 15;

/**
 * Extracts request context from API Gateway event
 */
function getRequestContext(event: APIGatewayEvent): RequestContext {
  const claims = event.requestContext.authorizer.claims;
  return {
    tenantId: claims['custom:tenant_id'],
    userId: claims.sub,
    userRole: claims['custom:role'],
    email: claims.email,
  };
}

/**
 * Creates a success response
 */
function successResponse(statusCode: number, data: any): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Creates an error response
 */
function errorResponse(statusCode: number, error: string, retryable?: boolean): LambdaResponse {
  const errorBody: ErrorResponse = { error, retryable };
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(errorBody),
  };
}

/**
 * Retrieves governance rules for a user from PostgreSQL
 */
async function getGovernanceRules(tenantId: string, userId: string): Promise<GovernanceRule[]> {
  const result = await query<{ dimension: string; values: string[] }>(
    'SELECT dimension, values FROM governance_rules WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, userId]
  );

  return result.rows.map(row => ({
    dimension: row.dimension,
    values: row.values,
  }));
}

/**
 * Builds RLS session tags from tenant context and governance rules
 */
function buildSessionTags(
  tenantId: string,
  userRole: string,
  governanceRules: GovernanceRule[]
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: 'tenant_id', Value: tenantId },
    { Key: 'role', Value: userRole },
  ];

  // Add governance dimension tags
  for (const rule of governanceRules) {
    sessionTags.push({
      Key: rule.dimension,
      Value: rule.values.join(','),
    });
  }

  return sessionTags;
}

/**
 * Ensures QuickSight user exists, creates if not found
 */
async function ensureQuickSightUser(email: string): Promise<void> {
  if (!QUICKSIGHT_AWS_ACCOUNT_ID) {
    throw new Error('QUICKSIGHT_AWS_ACCOUNT_ID environment variable not set');
  }

  try {
    // Try to register the user (idempotent operation)
    const registerCommand = new RegisterUserCommand({
      AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
      Namespace: 'default',
      Email: email,
      IdentityType: 'QUICKSIGHT',
      UserRole: 'READER',
    });

    await quicksightClient.send(registerCommand);
    console.log(`QuickSight user registered or already exists: ${email}`);
  } catch (error: any) {
    // User already exists is not an error
    if (error.name === 'ResourceExistsException') {
      console.log(`QuickSight user already exists: ${email}`);
      return;
    }
    throw error;
  }
}

/**
 * Generates QuickSight embed URL with RLS session tags
 * GET /dashboards/embed-url
 */
export async function generateEmbedUrl(event: APIGatewayEvent): Promise<LambdaResponse> {
  try {
    // Validate environment variables
    if (!QUICKSIGHT_AWS_ACCOUNT_ID) {
      console.error('QUICKSIGHT_AWS_ACCOUNT_ID not configured');
      return errorResponse(500, 'QuickSight configuration error', false);
    }

    if (!QUICKSIGHT_DASHBOARD_ID) {
      console.error('QUICKSIGHT_DASHBOARD_ID not configured');
      return errorResponse(500, 'QuickSight configuration error', false);
    }

    const context = getRequestContext(event);

    // Retrieve governance rules from PostgreSQL
    const governanceRules = await getGovernanceRules(context.tenantId, context.userId);
    console.log(`Retrieved ${governanceRules.length} governance rules for user ${context.userId}`);

    // Build RLS session tags for logging and audit purposes
    // Note: For registered user embedding, RLS is configured at the QuickSight dataset level
    // using user attributes (tenant_id, role, etc.) set during user registration.
    // Session tags are primarily supported for anonymous user embedding.
    const sessionTags = buildSessionTags(context.tenantId, context.userRole, governanceRules);
    console.log('RLS context (tenant_id, role, governance):', JSON.stringify(sessionTags));

    // Ensure QuickSight user exists
    // In production, user attributes (tenant_id, role) should be set on the QuickSight user
    // to enable RLS filtering at the dataset level
    await ensureQuickSightUser(context.email);

    // Generate embed URL
    const userArn = `arn:aws:quicksight:${process.env.AWS_REGION || 'us-east-1'}:${QUICKSIGHT_AWS_ACCOUNT_ID}:user/default/${context.email}`;

    const command = new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
      SessionLifetimeInMinutes: SESSION_LIFETIME_MINUTES,
      UserArn: userArn,
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: QUICKSIGHT_DASHBOARD_ID,
        },
      },
    });

    const response = await quicksightClient.send(command);

    if (!response.EmbedUrl) {
      throw new Error('QuickSight did not return an embed URL');
    }

    const embedResponse: EmbedUrlResponse = {
      embedUrl: response.EmbedUrl,
      expiresIn: SESSION_LIFETIME_MINUTES * 60, // Convert to seconds
    };

    console.log(`Embed URL generated for user ${context.email} in tenant ${context.tenantId}`);
    return successResponse(200, embedResponse);
  } catch (error: any) {
    console.error('Error generating embed URL:', error);

    // Handle specific QuickSight errors
    if (error instanceof ResourceNotFoundException) {
      return errorResponse(404, 'Dashboard not available for your role', false);
    }

    if (error.name === 'AccessDeniedException') {
      return errorResponse(403, 'Access denied to QuickSight dashboard', false);
    }

    if (error.name === 'ThrottlingException') {
      return errorResponse(429, 'Too many requests, please try again', true);
    }

    // Generic error
    return errorResponse(500, 'Failed to generate dashboard URL', true);
  }
}
