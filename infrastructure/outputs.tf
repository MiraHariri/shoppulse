output "vpc_id" {
  description = "VPC ID for ShopPulse Analytics"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "isolated_subnet_ids" {
  description = "Isolated subnet IDs"
  value       = aws_subnet.isolated[*].id
}

output "database_endpoint" {
  description = "RDS PostgreSQL instance endpoint"
  value       = aws_db_instance.postgres.address
}

output "database_port" {
  description = "RDS PostgreSQL instance port"
  value       = aws_db_instance.postgres.port
}

output "database_name" {
  description = "Database name"
  value       = var.db_name
}

output "database_username" {
  description = "Database username"
  value       = var.db_username
}

output "database_password" {
  description = "Database password (POC only - for production use Secrets Manager)"
  value       = random_password.db_password.result
  sensitive   = true
}

# Secrets Manager removed for POC
# output "database_secret_arn" {
#   description = "ARN of the database credentials secret"
#   value       = aws_secretsmanager_secret.db_credentials.arn
# }

# RDS Proxy removed for POC - Lambda connects directly to RDS
# output "database_proxy_endpoint" {
#   description = "RDS Proxy endpoint for connection pooling"
#   value       = aws_db_proxy.main.endpoint
# }

output "database_security_group_id" {
  description = "Security group ID for database access"
  value       = aws_security_group.database.id
}

output "lambda_configuration" {
  description = "Configuration values for Lambda functions (POC - no VPC, no Secrets Manager)"
  value = {
    rds_endpoint   = aws_db_instance.postgres.address
    rds_port       = aws_db_instance.postgres.port
    rds_database   = var.db_name
    rds_username   = var.db_username
    rds_password   = random_password.db_password.result
    vpc_id         = aws_vpc.main.id
    # Lambda runs without VPC for POC
    # Credentials passed via environment variables (not Secrets Manager)
  }
  sensitive = true
}

# Lambda security group and subnets removed for POC
# Lambda runs without VPC attachment
# output "lambda_security_group_id" {
#   description = "Security group ID for Lambda functions"
#   value       = aws_security_group.lambda.id
# }
#
# output "lambda_subnet_ids" {
#   description = "Private subnet IDs for Lambda functions"
#   value       = aws_subnet.private[*].id
# }

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "cognito_web_client_id" {
  description = "Cognito User Pool Web Client ID"
  value       = aws_cognito_user_pool_client.web_client.id
}

output "cognito_domain" {
  description = "Cognito User Pool domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_configuration" {
  description = "Complete Cognito configuration for frontend and Lambda"
  value = {
    user_pool_id  = aws_cognito_user_pool.main.id
    user_pool_arn = aws_cognito_user_pool.main.arn
    web_client_id = aws_cognito_user_pool_client.web_client.id
    region        = var.aws_region
    domain        = aws_cognito_user_pool_domain.main.domain
  }
  sensitive = false
}

# API Gateway Outputs
output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_root_resource_id" {
  description = "API Gateway root resource ID"
  value       = aws_api_gateway_rest_api.main.root_resource_id
}

output "api_gateway_execution_arn" {
  description = "API Gateway execution ARN for Lambda permissions"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

# API Gateway invoke URL and configuration
output "api_gateway_invoke_url" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_gateway_stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.main.stage_name
}

output "api_gateway_authorizer_id" {
  description = "Cognito authorizer ID for API Gateway"
  value       = aws_api_gateway_authorizer.cognito.id
}

output "api_gateway_configuration" {
  description = "Complete API Gateway configuration for Lambda and frontend"
  value = {
    api_id        = aws_api_gateway_rest_api.main.id
    api_name      = aws_api_gateway_rest_api.main.name
    invoke_url    = aws_api_gateway_stage.main.invoke_url
    stage_name    = aws_api_gateway_stage.main.stage_name
    authorizer_id = aws_api_gateway_authorizer.cognito.id
    execution_arn = aws_api_gateway_rest_api.main.execution_arn
    usage_plan_id = aws_api_gateway_usage_plan.main.id
  }
  sensitive = false
}
