# Lambda IAM Roles and Policies for ShopPulse Analytics
# Task 4.1: Create Lambda execution roles with least privilege IAM policies

# ============================================================================
# User Management Lambda IAM Role
# ============================================================================

# IAM Role for User Management Lambda
resource "aws_iam_role" "user_management_lambda" {
  name               = "${var.project_name}-user-management-lambda-role-${var.environment}"
  description        = "Execution role for ShopPulse user management Lambda function"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name        = "${var.project_name}-user-management-lambda-role"
    Component   = "Lambda"
    Function    = "UserManagement"
    Environment = var.environment
  }
}

# IAM Policy for User Management Lambda
resource "aws_iam_policy" "user_management_lambda" {
  name        = "${var.project_name}-user-management-lambda-policy-${var.environment}"
  description = "Least privilege policy for user management Lambda function"
  policy      = data.aws_iam_policy_document.user_management_lambda.json

  tags = {
    Name        = "${var.project_name}-user-management-lambda-policy"
    Component   = "Lambda"
    Function    = "UserManagement"
    Environment = var.environment
  }
}

# Attach policy to User Management Lambda role
resource "aws_iam_role_policy_attachment" "user_management_lambda" {
  role       = aws_iam_role.user_management_lambda.name
  policy_arn = aws_iam_policy.user_management_lambda.arn
}

# Attach AWS managed VPC execution policy for User Management Lambda
resource "aws_iam_role_policy_attachment" "user_management_lambda_vpc" {
  role       = aws_iam_role.user_management_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ============================================================================
# QuickSight Embed Lambda IAM Role
# ============================================================================

# IAM Role for QuickSight Embed Lambda
resource "aws_iam_role" "quicksight_embed_lambda" {
  name               = "${var.project_name}-quicksight-embed-lambda-role-${var.environment}"
  description        = "Execution role for ShopPulse QuickSight embed Lambda function"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name        = "${var.project_name}-quicksight-embed-lambda-role"
    Component   = "Lambda"
    Function    = "QuickSightEmbed"
    Environment = var.environment
  }
}

# IAM Policy for QuickSight Embed Lambda
resource "aws_iam_policy" "quicksight_embed_lambda" {
  name        = "${var.project_name}-quicksight-embed-lambda-policy-${var.environment}"
  description = "Least privilege policy for QuickSight embed Lambda function"
  policy      = data.aws_iam_policy_document.quicksight_embed_lambda.json

  tags = {
    Name        = "${var.project_name}-quicksight-embed-lambda-policy"
    Component   = "Lambda"
    Function    = "QuickSightEmbed"
    Environment = var.environment
  }
}

# Attach policy to QuickSight Embed Lambda role
resource "aws_iam_role_policy_attachment" "quicksight_embed_lambda" {
  role       = aws_iam_role.quicksight_embed_lambda.name
  policy_arn = aws_iam_policy.quicksight_embed_lambda.arn
}

# Attach AWS managed VPC execution policy for QuickSight Embed Lambda
resource "aws_iam_role_policy_attachment" "quicksight_embed_lambda_vpc" {
  role       = aws_iam_role.quicksight_embed_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ============================================================================
# IAM Policy Documents
# ============================================================================

# Lambda assume role policy (trust relationship)
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# User Management Lambda policy document
data "aws_iam_policy_document" "user_management_lambda" {
  # Cognito User Pool permissions
  statement {
    sid    = "CognitoUserManagement"
    effect = "Allow"

    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminSetUserPassword",
      "cognito-idp:AdminDisableUser",
      "cognito-idp:AdminEnableUser"
    ]

    resources = [
      aws_cognito_user_pool.main.arn
    ]
  }

  # Secrets Manager removed for POC - credentials passed via environment variables

  # CloudWatch Logs permissions
  statement {
    sid    = "CloudWatchLogsAccess"
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-user-management-*"
    ]
  }
}

# QuickSight Embed Lambda policy document
data "aws_iam_policy_document" "quicksight_embed_lambda" {
  # QuickSight permissions
  statement {
    sid    = "QuickSightEmbedAccess"
    effect = "Allow"

    actions = [
      "quicksight:GenerateEmbedUrlForRegisteredUser",
      "quicksight:RegisterUser",
      "quicksight:DescribeUser"
    ]

    resources = [
      "arn:aws:quicksight:${var.aws_region}:${data.aws_caller_identity.current.account_id}:user/*",
      "arn:aws:quicksight:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dashboard/*"
    ]
  }

  # Secrets Manager removed for POC - credentials passed via environment variables

  # CloudWatch Logs permissions
  statement {
    sid    = "CloudWatchLogsAccess"
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-quicksight-embed-*"
    ]
  }
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# ============================================================================
# Outputs
# ============================================================================

output "user_management_lambda_role_arn" {
  description = "ARN of the User Management Lambda execution role"
  value       = aws_iam_role.user_management_lambda.arn
}

output "user_management_lambda_role_name" {
  description = "Name of the User Management Lambda execution role"
  value       = aws_iam_role.user_management_lambda.name
}

output "quicksight_embed_lambda_role_arn" {
  description = "ARN of the QuickSight Embed Lambda execution role"
  value       = aws_iam_role.quicksight_embed_lambda.arn
}

output "quicksight_embed_lambda_role_name" {
  description = "Name of the QuickSight Embed Lambda execution role"
  value       = aws_iam_role.quicksight_embed_lambda.name
}

output "lambda_roles_configuration" {
  description = "Complete Lambda IAM roles configuration"
  value = {
    user_management = {
      role_arn  = aws_iam_role.user_management_lambda.arn
      role_name = aws_iam_role.user_management_lambda.name
    }
    quicksight_embed = {
      role_arn  = aws_iam_role.quicksight_embed_lambda.arn
      role_name = aws_iam_role.quicksight_embed_lambda.name
    }
  }
  sensitive = false
}
