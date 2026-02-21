/**
 * QuickSight Embed Lambda Handler
 * Generates embed URLs with tenant isolation and governance rules
 */

import {
  QuickSightClient,
  GenerateEmbedUrlForRegisteredUserCommand,
  GenerateEmbedUrlForAnonymousUserCommand,
  DescribeUserCommand,
  RegisterUserCommand,
  UpdateDashboardPermissionsCommand,
  ResourceNotFoundException,
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
const USE_ANONYMOUS_EMBEDDING =
  process.env.USE_ANONYMOUS_EMBEDDING === "true";

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
 * Builds RLS session tags from tenant context and governance rules
 */
function buildSessionTags(
  tenantId: string,
  userRole: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
    { Key: "role", Value: userRole },
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
 * Ensures QuickSight user exists with IAM identity type
 */
async function ensureQuickSightUser(
  email: string,
  sessionName: string,
  lambdaRoleArn: string,
  tenantId: string,
  userRole: string,
): Promise<string> {
  if (!QUICKSIGHT_AWS_ACCOUNT_ID) {
    throw new Error("QUICKSIGHT_AWS_ACCOUNT_ID environment variable not set");
  }

  // For IAM identity type, the username format is: role-name/session-name
  const roleName = lambdaRoleArn.split("/").pop() || "";
  const fullUserName = `${roleName}/${sessionName}`;
  const userArn = `arn:aws:quicksight:${process.env.AWS_REGION || "us-east-1"}:${QUICKSIGHT_AWS_ACCOUNT_ID}:user/default/${fullUserName}`;

  try {
    // Check if user exists
    const describeCommand = new DescribeUserCommand({
      AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
      Namespace: "default",
      UserName: fullUserName,
    });

    await quicksightClient.send(describeCommand);
    console.log(`QuickSight user exists: ${fullUserName}`);
    return fullUserName;
  } catch (error: any) {
    // User doesn't exist or ResourceExistsException, create with IAM identity
    if (
      error.name === "ResourceNotFoundException" ||
      error.name === "ResourceExistsException"
    ) {
      console.log(
        `User lookup failed, attempting to register: ${fullUserName}`,
      );

      try {
        const registerCommand = new RegisterUserCommand({
          AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
          Namespace: "default",
          Email: email,
          IdentityType: "IAM",
          UserRole: "READER",
          IamArn: lambdaRoleArn,
          SessionName: sessionName,
        });

        await quicksightClient.send(registerCommand);
        console.log(
          `QuickSight user created: ${fullUserName} with tenant_id: ${tenantId}, role: ${userRole}`,
        );

        // Grant dashboard permissions to the new user
        if (QUICKSIGHT_DASHBOARD_ID) {
          try {
            const grantPermissionsCommand =
              new UpdateDashboardPermissionsCommand({
                AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
                DashboardId: QUICKSIGHT_DASHBOARD_ID,
                GrantPermissions: [
                  {
                    Principal: userArn,
                    Actions: [
                      "quicksight:DescribeDashboard",
                      "quicksight:ListDashboardVersions",
                      "quicksight:QueryDashboard",
                    ],
                  },
                ],
              });

            await quicksightClient.send(grantPermissionsCommand);
            console.log(
              `Dashboard permissions granted to user: ${fullUserName}`,
            );
          } catch (permError: any) {
            console.error(
              `Failed to grant dashboard permissions: ${permError.message}`,
            );
            // Don't fail the entire operation if permission grant fails
          }
        }

        return fullUserName;
      } catch (registerError: any) {
        // If user already exists, that's fine
        if (registerError.name === "ResourceExistsException") {
          console.log(`User already exists: ${fullUserName}`);
          return fullUserName;
        }
        throw registerError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Generates QuickSight embed URL with RLS session tags
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

    // Build RLS session tags
    const sessionTags = buildSessionTags(
      context.tenantId,
      context.userRole,
      governanceRules,
    );
    console.log(
      "RLS context (tenant_id, role, governance):",
      JSON.stringify(sessionTags),
    );

    console.log(
      `Using ${USE_ANONYMOUS_EMBEDDING ? "ANONYMOUS" : "REGISTERED"} embedding`,
    );

    let embedUrl: string;

    if (USE_ANONYMOUS_EMBEDDING) {
      // Anonymous embedding - supports session tags for RLS
      embedUrl = await generateAnonymousEmbedUrl(sessionTags);
    } else {
      // Registered user embedding - requires QuickSight user
      embedUrl = await generateRegisteredUserEmbedUrl(
        context.email,
        context.tenantId,
        context.userRole,
      );
    }

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
    if (error instanceof ResourceNotFoundException) {
      return errorResponse(404, "Dashboard not available for your role", false);
    }

    if (error.name === "AccessDeniedException") {
      return errorResponse(403, "Access denied to QuickSight dashboard", false);
    }

    if (error.name === "ThrottlingException") {
      return errorResponse(429, "Too many requests, please try again", true);
    }

    if (error.name === "UnsupportedPricingPlanException") {
      return errorResponse(
        503,
        "QuickSight pricing plan does not support this feature. Try setting USE_ANONYMOUS_EMBEDDING=false",
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

/**
 * Generate registered user embed URL
 * Works with per-session pricing
 */
async function generateRegisteredUserEmbedUrl(
  email: string,
  tenantId: string,
  userRole: string,
): Promise<string> {
  if (!QUICKSIGHT_AWS_ACCOUNT_ID || !QUICKSIGHT_DASHBOARD_ID) {
    throw new Error("QuickSight configuration missing");
  }

  // Create a unique session name from email (replace @ and . with -)
  const sessionName = `cognito-${email.replace(/[@.]/g, "-")}`;

  // Get the Lambda execution role ARN
  const lambdaRoleArn =
    process.env.QUICKSIGHT_EMBED_LAMBDA_ROLE_ARN ||
    `arn:aws:iam::${QUICKSIGHT_AWS_ACCOUNT_ID}:role/shoppulse-analytics-quicksight-embed-lambda-role-dev`;

  // Ensure QuickSight user exists and get the full username
  const fullUserName = await ensureQuickSightUser(
    email,
    sessionName,
    lambdaRoleArn,
    tenantId,
    userRole,
  );

  // Generate embed URL for registered user
  const userArn = `arn:aws:quicksight:${process.env.AWS_REGION || "us-east-1"}:${QUICKSIGHT_AWS_ACCOUNT_ID}:user/default/${fullUserName}`;

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

  console.log(
    `Generating embed URL for user ARN: ${userArn} with tenant_id: ${tenantId}`,
  );

  const response = await quicksightClient.send(command);

  if (!response.EmbedUrl) {
    throw new Error("QuickSight did not return an embed URL");
  }

  return response.EmbedUrl;
}
