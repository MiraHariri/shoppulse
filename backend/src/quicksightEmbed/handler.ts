/**
 * QuickSight Embed Lambda Handler
 * Generates embed URLs using anonymous embedding with session tags
 */

import {
  QuickSightClient,
  GenerateEmbedUrlForAnonymousUserCommand,
} from "@aws-sdk/client-quicksight";
import {
  APIGatewayEvent,
  LambdaResponse,
  RequestContext,
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
const QUICKSIGHT_Q_TOPIC_ID = process.env.QUICKSIGHT_Q_TOPIC_ID;
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
 * Builds session tags from tenant context
 * Used for anonymous embedding with RLS
 * Includes: tenant_id only
 */
function buildSessionTags(tenantId: string): SessionTag[] {
  return [
    { Key: "tenant_id", Value: tenantId },
  ];
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

    // Build session tags (tenant_id only)
    const sessionTags = buildSessionTags(context.tenantId);
    console.log(
      "Session tags (tenant_id):",
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
 * Generates QuickSight Q (agent) embed URL with session tags for RLS
 * GET /dashboards/q-embed-url
 */
export async function generateQEmbedUrl(
  event: APIGatewayEvent,
): Promise<LambdaResponse> {
  try {
    // Validate environment variables
    if (!QUICKSIGHT_AWS_ACCOUNT_ID) {
      console.error("QUICKSIGHT_AWS_ACCOUNT_ID not configured");
      return errorResponse(500, "QuickSight configuration error", false);
    }

    if (!QUICKSIGHT_Q_TOPIC_ID) {
      console.error("QUICKSIGHT_Q_TOPIC_ID not configured");
      return errorResponse(500, "QuickSight Q Topic not configured", false);
    }

    const context = getRequestContext(event);

    // Build session tags (tenant_id only)
    const sessionTags = buildSessionTags(context.tenantId);
    console.log(
      "Session tags for Q (tenant_id):",
      JSON.stringify(sessionTags),
    );

    // Generate anonymous embed URL for Q
    const embedUrl = await generateAnonymousQEmbedUrl(sessionTags);

    const embedResponse: EmbedUrlResponse = {
      embedUrl: embedUrl,
      expiresIn: SESSION_LIFETIME_MINUTES * 60, // Convert to seconds
    };

    console.log(
      `Q Embed URL generated for user ${context.email} in tenant ${context.tenantId}`,
    );
    return successResponse(200, embedResponse);
  } catch (error: any) {
    console.error("Error generating Q embed URL:", error);

    // Handle specific QuickSight errors
    if (error.name === "AccessDeniedException") {
      return errorResponse(403, "Access denied to QuickSight Q", false);
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
    return errorResponse(500, "Failed to generate Q agent URL", true);
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

/**
 * Generate anonymous embed URL for Q agent with session tags for RLS
 * Requires Capacity Pricing plan
 */
async function generateAnonymousQEmbedUrl(
  sessionTags: SessionTag[],
): Promise<string> {
  if (!QUICKSIGHT_AWS_ACCOUNT_ID || !QUICKSIGHT_Q_TOPIC_ID) {
    throw new Error("QuickSight Q configuration missing");
  }

  const command = new GenerateEmbedUrlForAnonymousUserCommand({
    AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
    Namespace: "default",
    SessionLifetimeInMinutes: SESSION_LIFETIME_MINUTES,
    AuthorizedResourceArns: [
      `arn:aws:quicksight:${process.env.AWS_REGION || "us-east-1"}:${QUICKSIGHT_AWS_ACCOUNT_ID}:topic/${QUICKSIGHT_Q_TOPIC_ID}`,
    ],
    ExperienceConfiguration: {
      GenerativeQnA: {
        InitialTopicId: QUICKSIGHT_Q_TOPIC_ID,
      },
    },
    SessionTags: sessionTags,
  });

  console.log("Generating anonymous Q embed URL with session tags for RLS");
  console.log("Topic ID:", QUICKSIGHT_Q_TOPIC_ID);

  const response = await quicksightClient.send(command);

  if (!response.EmbedUrl) {
    throw new Error("QuickSight did not return a Q embed URL");
  }

  return response.EmbedUrl;
}
