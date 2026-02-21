# Lambda API Gateway Integration
# This file integrates Serverless-deployed Lambda functions with Terraform-managed API Gateway

# Data source to get the Lambda function ARN (deployed by Serverless)
data "aws_lambda_function" "user_management" {
  function_name = "${var.environment}-shoppulse-user-management"
}

# ============================================================================
# API Gateway CloudWatch Logs Role (Account-level)
# ============================================================================

# IAM role for API Gateway to write logs to CloudWatch
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.project_name}-api-gateway-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-api-gateway-cloudwatch-role"
  }
}

# Attach AWS managed policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Set the CloudWatch Logs role ARN in API Gateway account settings
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn

  depends_on = [aws_iam_role_policy_attachment.api_gateway_cloudwatch]
}

# ============================================================================
# Lambda Permissions for API Gateway
# ============================================================================

# Permission for API Gateway to invoke user management Lambda
resource "aws_lambda_permission" "api_gateway_user_management" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.user_management.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ============================================================================
# API Gateway Integrations for User Management Endpoints
# ============================================================================

# GET /users integration
resource "aws_api_gateway_integration" "users_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.users.id
  http_method             = aws_api_gateway_method.users_get.http_method
  integration_http_method = "POST" # Lambda always uses POST
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# POST /users integration
resource "aws_api_gateway_integration" "users_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.users.id
  http_method             = aws_api_gateway_method.users_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# GET /users/{userId} integration
resource "aws_api_gateway_integration" "user_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_id.id
  http_method             = aws_api_gateway_method.user_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# PUT /users/{userId} integration
resource "aws_api_gateway_integration" "user_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_id.id
  http_method             = aws_api_gateway_method.user_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# DELETE /users/{userId} integration
resource "aws_api_gateway_integration" "user_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_id.id
  http_method             = aws_api_gateway_method.user_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# PUT /users/{userId}/role integration
resource "aws_api_gateway_integration" "user_role_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_role.id
  http_method             = aws_api_gateway_method.user_role_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.user_management.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_user_management]
}

# ============================================================================
# API Gateway Deployment
# ============================================================================

# Deployment resource - triggers redeployment when integrations change
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.users_get.id,
      aws_api_gateway_integration.users_post.id,
      aws_api_gateway_integration.user_id_get.id,
      aws_api_gateway_integration.user_id_put.id,
      aws_api_gateway_integration.user_id_delete.id,
      aws_api_gateway_integration.user_role_put.id,
      # Include OPTIONS integrations
      aws_api_gateway_integration.users_options.id,
      aws_api_gateway_integration.user_id_options.id,
      aws_api_gateway_integration.user_role_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    # User management integrations
    aws_api_gateway_integration.users_get,
    aws_api_gateway_integration.users_post,
    aws_api_gateway_integration.user_id_get,
    aws_api_gateway_integration.user_id_put,
    aws_api_gateway_integration.user_id_delete,
    aws_api_gateway_integration.user_role_put,
    # CORS OPTIONS integrations
    aws_api_gateway_integration.users_options,
    aws_api_gateway_integration.user_id_options,
    aws_api_gateway_integration.user_role_options,
    # Dashboard OPTIONS integrations (MOCK - no Lambda needed)
    aws_api_gateway_integration.dashboards_embed_url_options,
    aws_api_gateway_integration.dashboards_list_options,
    # Governance OPTIONS integrations (MOCK - no Lambda needed)
    aws_api_gateway_integration.governance_rules_options,
    # QuickSight Embed Lambda integration
    aws_api_gateway_integration.dashboards_embed_url_get,
    # Temporary MOCK integrations for not-yet-implemented endpoints
    aws_api_gateway_integration.dashboards_list_get_temp,
    aws_api_gateway_integration.governance_rules_get_temp,
    aws_api_gateway_integration.governance_rules_put_temp,
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  # Enable CloudWatch logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  # Enable X-Ray tracing
  xray_tracing_enabled = true

  tags = {
    Name = "${var.project_name}-api-stage"
  }

  # Ensure CloudWatch Logs role is set before creating stage
  depends_on = [aws_api_gateway_account.main]
}

# API Gateway Method Settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    # Enable CloudWatch metrics
    metrics_enabled = true
    logging_level   = "INFO"

    # Enable detailed CloudWatch metrics
    data_trace_enabled = true

    # Throttling settings (rate limiting)
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "main" {
  name        = "${var.project_name}-usage-plan"
  description = "Usage plan with rate limiting for ShopPulse Analytics API"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = 1000000
    period = "MONTH"
  }

  throttle_settings {
    burst_limit = 5000
    rate_limit  = 10000
  }
}
