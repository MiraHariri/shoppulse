# AWS Cognito User Pool for ShopPulse Analytics
# Task 2: Set up AWS Cognito User Pool
# Requirements: 1.1, 1.4

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  # Custom attributes for tenant_id and role
  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    required            = false  # Custom attributes cannot be required
    mutable             = true   # Mutable - can be changed (WARNING: reduces tenant isolation security)

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    required            = false  # Custom attributes cannot be required
    mutable             = true   # Can be changed

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Password policy: min 8 chars, uppercase, lowercase, numbers
  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # Token expiration: access 1 hour, refresh 30 days
  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  # Account recovery via email
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto-verify email
  auto_verified_attributes = ["email"]

  # Username configuration - use email as username
  username_attributes = ["email"]

  # Username case sensitivity
  username_configuration {
    case_sensitive = false
  }

  # MFA configuration (off for POC)
  mfa_configuration = "OFF"

  # Device tracking
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = true
  }

  # Deletion protection
  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  tags = {
    Name = "${var.project_name}-${var.environment}-user-pool"
  }
}

# Cognito User Pool Client (for frontend application)
resource "aws_cognito_user_pool_client" "web_client" {
  name         = "${var.project_name}-${var.environment}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Token validity settings
  access_token_validity  = 60 # 60 minutes = 1 hour
  id_token_validity      = 60 # 60 minutes = 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # OAuth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "custom:tenant_id",
    "custom:role"
  ]

  write_attributes = [
    "email",
    "custom:tenant_id",
    "custom:role"
  ]

  # Enable token revocation
  enable_token_revocation = true

  # Disable client secret (for SPA)
  generate_secret = false
}

# Cognito User Pool Domain (for hosted UI - optional)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Random string for unique domain suffix
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}
