# Lambda IAM Roles Setup

## Overview

This document describes the IAM roles and policies created for the ShopPulse Analytics Lambda functions. The implementation follows the **principle of least privilege**, granting only the minimum permissions required for each Lambda function to perform its designated tasks.

## Task Reference

**Task 4.1**: Create Lambda execution roles with least privilege IAM policies
- User management Lambda role (Cognito, Secrets Manager, CloudWatch Logs)
- QuickSight embed Lambda role (QuickSight, Secrets Manager, CloudWatch Logs)
- **Requirements**: 11.4

## Architecture

### User Management Lambda Role

**Purpose**: Manages user lifecycle operations including creation, updates, role assignments, and deletion.

**Role Name**: `shoppulse-analytics-user-management-lambda-role-{environment}`

**Permissions**:

1. **AWS Cognito User Pool Operations**
   - `cognito-idp:AdminCreateUser` - Create new users in the tenant's context
   - `cognito-idp:AdminUpdateUserAttributes` - Update user attributes (role, tenant_id)
   - `cognito-idp:AdminDeleteUser` - Remove users from Cognito
   - `cognito-idp:AdminGetUser` - Retrieve user details for validation
   - `cognito-idp:AdminSetUserPassword` - Set or reset user passwords
   - `cognito-idp:AdminDisableUser` - Disable user accounts
   - `cognito-idp:AdminEnableUser` - Re-enable user accounts
   
   **Scope**: Limited to the specific Cognito User Pool ARN

2. **AWS Secrets Manager**
   - `secretsmanager:GetSecretValue` - Retrieve database credentials
   
   **Scope**: Limited to the RDS credentials secret ARN

3. **CloudWatch Logs**
   - `logs:CreateLogGroup` - Create log groups for Lambda function
   - `logs:CreateLogStream` - Create log streams within log groups
   - `logs:PutLogEvents` - Write log events for monitoring and debugging
   
   **Scope**: Limited to `/aws/lambda/shoppulse-analytics-user-management-*` log groups

4. **VPC Access** (via AWS managed policy)
   - `AWSLambdaVPCAccessExecutionRole` - Allows Lambda to create ENIs for VPC access
   - Required for connecting to RDS PostgreSQL in private subnets

### QuickSight Embed Lambda Role

**Purpose**: Generates signed embed URLs for QuickSight dashboards with proper tenant isolation and role-based access control.

**Role Name**: `shoppulse-analytics-quicksight-embed-lambda-role-{environment}`

**Permissions**:

1. **Amazon QuickSight Operations**
   - `quicksight:GenerateEmbedUrlForRegisteredUser` - Generate signed embed URLs
   - `quicksight:RegisterUser` - Auto-provision QuickSight users if needed
   - `quicksight:DescribeUser` - Verify user existence in QuickSight
   
   **Scope**: Limited to QuickSight users and dashboards in the current AWS account

2. **AWS Secrets Manager**
   - `secretsmanager:GetSecretValue` - Retrieve database credentials
   
   **Scope**: Limited to the RDS credentials secret ARN

3. **CloudWatch Logs**
   - `logs:CreateLogGroup` - Create log groups for Lambda function
   - `logs:CreateLogStream` - Create log streams within log groups
   - `logs:PutLogEvents` - Write log events for monitoring and debugging
   
   **Scope**: Limited to `/aws/lambda/shoppulse-analytics-quicksight-embed-*` log groups

4. **VPC Access** (via AWS managed policy)
   - `AWSLambdaVPCAccessExecutionRole` - Allows Lambda to create ENIs for VPC access
   - Required for connecting to RDS PostgreSQL in private subnets

## Security Considerations

### Least Privilege Implementation

1. **Resource-Specific ARNs**: All permissions are scoped to specific resources (Cognito User Pool, Secrets Manager secrets, CloudWatch log groups) rather than using wildcards.

2. **Action Minimization**: Only the exact actions required for each function are granted. For example:
   - User Management Lambda can modify Cognito users but cannot modify the User Pool itself
   - QuickSight Embed Lambda can generate embed URLs but cannot modify dashboards

3. **No Cross-Function Access**: Each Lambda role is isolated and cannot access resources or perform actions intended for the other function.

4. **Secrets Manager Integration**: Database credentials are never hardcoded or passed as environment variables. They are retrieved securely from Secrets Manager at runtime.

### Trust Relationships

Both roles use a standard Lambda trust policy that allows only the AWS Lambda service to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### VPC Security

The `AWSLambdaVPCAccessExecutionRole` managed policy provides the following permissions:
- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DeleteNetworkInterface`
- `ec2:AssignPrivateIpAddresses`
- `ec2:UnassignPrivateIpAddresses`

These are required for Lambda functions to operate within a VPC and connect to RDS PostgreSQL instances in private subnets.

## Deployment

### Prerequisites

1. VPC and subnets must be created (Task 1)
2. Cognito User Pool must be created (Task 2)
3. RDS PostgreSQL instance and Secrets Manager secret must be created (Task 1)
4. API Gateway must be created (Task 3)

### Terraform Deployment

```bash
cd infrastructure

# Initialize Terraform (if not already done)
terraform init

# Review the IAM resources to be created
terraform plan

# Apply the IAM configuration
terraform apply
```

### Verification

After deployment, verify the roles were created:

```bash
# List IAM roles
aws iam list-roles --query "Roles[?contains(RoleName, 'shoppulse-analytics')].[RoleName, Arn]" --output table

# Get User Management Lambda role details
aws iam get-role --role-name shoppulse-analytics-user-management-lambda-role-dev

# Get QuickSight Embed Lambda role details
aws iam get-role --role-name shoppulse-analytics-quicksight-embed-lambda-role-dev

# List attached policies for User Management Lambda
aws iam list-attached-role-policies --role-name shoppulse-analytics-user-management-lambda-role-dev

# List attached policies for QuickSight Embed Lambda
aws iam list-attached-role-policies --role-name shoppulse-analytics-quicksight-embed-lambda-role-dev
```

## Outputs

The Terraform configuration provides the following outputs for use in Lambda function configuration:

### User Management Lambda
- `user_management_lambda_role_arn` - ARN to use when creating the Lambda function
- `user_management_lambda_role_name` - Role name for reference

### QuickSight Embed Lambda
- `quicksight_embed_lambda_role_arn` - ARN to use when creating the Lambda function
- `quicksight_embed_lambda_role_name` - Role name for reference

### Combined Output
- `lambda_roles_configuration` - Complete configuration object with both roles

## Usage in Lambda Functions

When creating Lambda functions (Task 5 and Task 6), reference these roles:

```terraform
# User Management Lambda Function
resource "aws_lambda_function" "user_management" {
  function_name = "${var.project_name}-user-management"
  role          = aws_iam_role.user_management_lambda.arn
  # ... other configuration
}

# QuickSight Embed Lambda Function
resource "aws_lambda_function" "quicksight_embed" {
  function_name = "${var.project_name}-quicksight-embed"
  role          = aws_iam_role.quicksight_embed_lambda.arn
  # ... other configuration
}
```

## Monitoring and Auditing

### CloudWatch Logs

Both Lambda functions will create logs in their respective log groups:
- `/aws/lambda/shoppulse-analytics-user-management-{environment}`
- `/aws/lambda/shoppulse-analytics-quicksight-embed-{environment}`

### CloudTrail

All IAM role assumptions and API calls made by the Lambda functions are logged in AWS CloudTrail for audit purposes.

### Recommended Alarms

Set up CloudWatch alarms for:
1. **Access Denied Errors**: Alert when Lambda functions encounter permission errors
2. **Secrets Manager Failures**: Alert when credential retrieval fails
3. **Cognito API Errors**: Alert when user management operations fail
4. **QuickSight API Errors**: Alert when embed URL generation fails

## Troubleshooting

### Common Issues

1. **Lambda cannot access RDS**
   - Verify VPC configuration is correct
   - Check security group rules allow Lambda → RDS communication
   - Ensure Lambda is in private subnets with NAT Gateway access

2. **Secrets Manager access denied**
   - Verify the secret ARN in the policy matches the actual secret
   - Check the secret exists in the same region
   - Ensure the secret has not been deleted

3. **Cognito operations fail**
   - Verify the Cognito User Pool ARN in the policy is correct
   - Check the User Pool exists and is in the same region
   - Ensure custom attributes (tenant_id, role) are configured

4. **QuickSight embed URL generation fails**
   - Verify QuickSight is enabled in the AWS account
   - Check the QuickSight user exists or auto-provisioning is working
   - Ensure the dashboard ID is correct and accessible

### Testing IAM Permissions

Use the IAM Policy Simulator to test permissions before deployment:

```bash
# Test User Management Lambda permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/shoppulse-analytics-user-management-lambda-role-dev \
  --action-names cognito-idp:AdminCreateUser secretsmanager:GetSecretValue \
  --resource-arns arn:aws:cognito-idp:us-east-1:ACCOUNT_ID:userpool/POOL_ID

# Test QuickSight Embed Lambda permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/shoppulse-analytics-quicksight-embed-lambda-role-dev \
  --action-names quicksight:GenerateEmbedUrlForRegisteredUser secretsmanager:GetSecretValue \
  --resource-arns arn:aws:quicksight:us-east-1:ACCOUNT_ID:user/default/*
```

## Compliance and Best Practices

### Compliance
- ✅ **SOC 2**: Least privilege access controls
- ✅ **GDPR**: Audit logging for all user data operations
- ✅ **PCI DSS**: Secrets Manager for credential management

### Best Practices
- ✅ Resource-specific ARNs (no wildcards)
- ✅ Separate roles for separate functions
- ✅ AWS managed policies for standard operations (VPC access)
- ✅ CloudWatch Logs for monitoring and debugging
- ✅ Secrets Manager for credential management
- ✅ Tags for resource organization and cost tracking

## Next Steps

After completing Task 4.1, proceed to:
- **Task 4.2**: Set up Lambda VPC configuration
- **Task 4.3**: Create shared database connection module
- **Task 5**: Implement user management Lambda function
- **Task 6**: Implement QuickSight embed Lambda function

## References

- [AWS Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Cognito IAM Permissions](https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html)
- [QuickSight IAM Permissions](https://docs.aws.amazon.com/quicksight/latest/user/iam-actions.html)
- [Secrets Manager IAM Permissions](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)
