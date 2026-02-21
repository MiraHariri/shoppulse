/**
 * QuickSight Embed Lambda Handler
 * Generates embed URLs using anonymous embedding with session tags
 */

import {
  QuickSightClient,
  GenerateEmbedUrlForAnonymousUserCommand,
} from "@aws-sdk/client-quicksight";
import { query } from "../shared/db";
import {
  APIGatewayEvent,
  LambdaResponse,
  RequestContext,
  GovernanceRule,
  SessionTag,
  ErrorResponse,
  EmbedUrlResponse,
} from "./types";

/**
 * QuickSight client instance
 */
const quicksightClient = new QuickSightClient({
  region: process.env.AWS_REGION || "us-east-1",
});

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
  retryable?: boolean,
): LambdaResponse {
  const errorBody: ErrorResponse = { error, retryable };
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
 * Retrieves governance rules for a user from PostgreSQL
 */
async function getGovernanceRules(
  tenantId: string,
  userId: string,
): Promise<GovernanceRule[]> {
  const result = await query<{ dimension: string; values: string[] }>(
    "SELECT dimension, values FROM governance_rules WHERE tenant_id = $1 AND user_id = $2",
    [tenantId, userId],
  );

  return result.rows.map((row) => ({
    dimension: row.dimension,
    values: row.values,
  }));
}

/**
 * Builds session tags from tenant context, user role, and governance rules
 * Used for anonymous embedding with RLS
 */
function buildSessionTags(
  tenantId: string,
  userRole: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
    { Key: "userRole", Value: userRole },
  ];

  // Add governance dimension tags
  for (const rule of governanceRules) {
    sessionTags.push({
      Key: rule.dimension,
      Value: rule.values.join(","),
    });
  }

  return sessionTags;
}

/**
 * Generates QuickSight embed URL with session tags for RLS
 * GET /dashboards/embed-url
 */
export async function generateEmbedUrl(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    // Validate environment variables
    if (!QUICKSIGHT_AWS_ACCOUNT_ID) {
      console.error("QUICKSIGHT_AWS_ACCOUNT_ID not configured");
      return errorResponse(500, "QuickSight configuration error", false);
    }

    if (!QUICKSIGHT_DASHBOARD_ID) {
      console.error("QUICKSIGHT_DASHBOARD_ID not configured");
      return errorResponse(500, "QuickSight configuration error", false);
    }

    const context = getRequestContext(event);

    // Retrieve governance rules from PostgreSQL
    const governanceRules = await getGovernanceRules(
      context.tenantId,
      context.userId,
    );
    console.log(
      `Retrieved ${governanceRules.length} governance rules for user ${context.userId}`,
    );

    // Build session tags (tenant_id, userRole, governance rules)
    const sessionTags = buildSessionTags(
      context.tenantId,
      context.userRole,
      governanceRules,
    );
    console.log(
      "Session tags (tenant_id, userRole, governance rules):",
      JSON.stringify(sessionTags),
    );

    // Generate anonymous embed URL
    const embedUrl = await generateAnonymousEmbedUrl(sessionTags);

    const embedResponse: EmbedUrlResponse = {
      embedUrl: embedUrl,
      expiresIn: SESSION_LIFETIME_MINUTES * 60, // Convert to seconds
    };

    console.log(
      `Embed URL generated for user ${context.email} in tenant ${context.tenantId}`,
    );
    return successResponse(200, embedResponse);
  } catch (error: any) {
    console.error("Error generating embed URL:", error);

    // Handle specific QuickSight errors
    if (error.name === "AccessDeniedException") {
      return errorResponse(403, "Access denied to QuickSight dashboard", false);
    }

    if (error.name === "ThrottlingException") {
      return errorResponse(429, "Too many requests, please try again", true);
    }

    if (error.name === "UnsupportedPricingPlanException") {
      return errorResponse(
        503,
        "QuickSight Capacity Pricing plan required for anonymous embedding",
        false,
      );
    }

    // Generic error
    return errorResponse(500, "Failed to generate dashboard URL", true);
  }
}

/**
 * Generate anonymous embed URL with session tags for RLS
 * Requires Capacity Pricing plan
 */
async function generateAnonymousEmbedUrl(
  sessionTags: SessionTag[],
): Promise<string> {
  if (!QUICKSIGHT_AWS_ACCOUNT_ID || !QUICKSIGHT_DASHBOARD_ID) {
    throw new Error("QuickSight configuration missing");
  }

  const command = new GenerateEmbedUrlForAnonymousUserCommand({
    AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
    Namespace: "default",
    SessionLifetimeInMinutes: SESSION_LIFETIME_MINUTES,
    AuthorizedResourceArns: [
      `arn:aws:quicksight:${process.env.AWS_REGION || "us-east-1"}:${QUICKSIGHT_AWS_ACCOUNT_ID}:dashboard/${QUICKSIGHT_DASHBOARD_ID}`,
    ],
    ExperienceConfiguration: {
      Dashboard: {
        InitialDashboardId: QUICKSIGHT_DASHBOARD_ID,
      },
    },
    SessionTags: sessionTags,
  });

  console.log("Generating anonymous embed URL with session tags for RLS");

  const response = await quicksightClient.send(command);

  if (!response.EmbedUrl) {
    throw new Error("QuickSight did not return an embed URL");
  }

  return response.EmbedUrl;
}
