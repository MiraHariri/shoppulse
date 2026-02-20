# Lambda VPC Configuration - Task 4.2

## Overview

This document describes the Lambda VPC configuration for ShopPulse Analytics, implementing secure network connectivity between Lambda functions and RDS PostgreSQL database.

**Task**: 4.2 Set up Lambda VPC configuration  
**Requirements**: 2.2 (Strict Tenant Data Isolation - Backend Service queries RDS)

## Architecture

Lambda functions are deployed in **private subnets** with the following network configuration:

```
┌─────────────────────────────────────────────────────────────┐
│                         VPC (10.0.0.0/16)                    │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Private Subnet 1 │         │ Private Subnet 2 │         │
│  │  (10.0.2.0/24)   │         │  (10.0.3.0/24)   │         │
│  │                  │         │                  │         │
│  │  ┌────────────┐  │         │  ┌────────────┐  │         │
│  │  │  Lambda    │  │         │  │  Lambda    │  │         │
│  │  │ Functions  │──┼─────────┼──│ Functions  │  │         │
│  │  └────────────┘  │         │  └────────────┘  │         │
│  │        │         │         │        │         │         │
│  └────────┼─────────┘         └────────┼─────────┘         │
│           │                            │                    │
│           │         ┌──────────────────┘                    │
│           │         │                                       │
│           ▼         ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │         Isolated Subnet (Database)          │           │
│  │              (10.0.4.0/24)                  │           │
│  │                                             │           │
│  │         ┌─────────────────────┐             │           │
│  │         │  RDS PostgreSQL     │             │           │
│  │         │  + RDS Proxy        │             │           │
│  │         └─────────────────────┘             │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  NAT Gateway ──> Internet Gateway (for AWS API calls)       │
└─────────────────────────────────────────────────────────────┘
```

## Components Created

### 1. Lambda Security Group

**Resource**: `aws_security_group.lambda`  
**Name**: `shoppulse-analytics-dev-lambda-sg`

This security group is attached to all Lambda functions and controls their network access.

**Egress Rules**:
- **Port 5432 (PostgreSQL)**: Allow outbound connections to RDS database security group
- **Port 443 (HTTPS)**: Allow outbound connections to AWS services (Cognito, QuickSight, Secrets Manager)

**Purpose**: Implements least-privilege network access for Lambda functions.

### 2. Database Security Group Rule

**Resource**: `aws_security_group_rule.database_ingress_lambda`

Adds an ingress rule to the existing database security group to allow connections from Lambda functions.

**Configuration**:
- **Protocol**: TCP
- **Port**: 5432
- **Source**: Lambda security group
- **Description**: "Allow Lambda functions to connect to RDS"

### 3. VPC Endpoints (Optional but Recommended)

**Secrets Manager VPC Endpoint**: `aws_vpc_endpoint.secrets_manager`

- **Type**: Interface endpoint
- **Subnets**: Private subnets (where Lambda runs)
- **Private DNS**: Enabled
- **Purpose**: Allows Lambda to access Secrets Manager without going through NAT Gateway, improving performance and reducing costs

**VPC Endpoints Security Group**: `aws_security_group.vpc_endpoints`

- **Ingress**: Port 443 from Lambda security group
- **Purpose**: Controls access to VPC endpoints

## Lambda Function Configuration

When creating Lambda functions, use the following VPC configuration:

```hcl
resource "aws_lambda_function" "example" {
  # ... other configuration ...

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Required IAM role must include AWSLambdaVPCAccessExecutionRole
}
```

### Required IAM Permissions

Lambda execution roles must include the `AWSLambdaVPCAccessExecutionRole` managed policy, which provides:

- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DeleteNetworkInterface`
- `ec2:AssignPrivateIpAddresses`
- `ec2:UnassignPrivateIpAddresses`

These permissions are already configured in Task 4.1 (Lambda IAM roles).

## Network Flow

### Lambda to RDS Connection Flow

1. Lambda function starts in private subnet
2. Lambda creates Elastic Network Interface (ENI) in private subnet
3. Lambda connects to RDS Proxy endpoint in isolated subnet
4. Security group rules allow traffic:
   - Lambda SG allows egress to Database SG on port 5432
   - Database SG allows ingress from Lambda SG on port 5432
5. RDS Proxy forwards connection to RDS PostgreSQL instance

### Lambda to AWS Services Connection Flow

1. Lambda function makes AWS API call (e.g., Cognito, QuickSight)
2. Traffic routes through NAT Gateway in public subnet
3. NAT Gateway forwards to Internet Gateway
4. Request reaches AWS service endpoint
5. Response follows reverse path

**With VPC Endpoints** (recommended):
1. Lambda function makes AWS API call
2. Traffic routes to VPC endpoint in private subnet
3. VPC endpoint forwards to AWS service via AWS PrivateLink
4. No NAT Gateway traversal required (faster, cheaper, more secure)

## Security Considerations

### Network Isolation

- **Lambda in Private Subnets**: Lambda functions have no direct internet access
- **Database in Isolated Subnets**: RDS has no internet access at all
- **Security Groups**: Implement least-privilege access control
- **VPC Flow Logs**: All network traffic is logged for audit

### Defense in Depth

This VPC configuration is one layer of the multi-layered security approach:

1. **Network Layer** (this task): Security groups and subnet isolation
2. **Application Layer**: Tenant ID validation in Lambda code
3. **Database Layer**: Tenant ID in all queries
4. **Authentication Layer**: Cognito JWT tokens with tenant_id claim

### Compliance with Requirements

**Requirement 2.2**: "WHEN the Backend_Service queries the RDS database, THE Backend_Service SHALL include tenant_id in all WHERE clauses"

This VPC configuration ensures:
- Lambda functions can securely connect to RDS
- Network traffic is isolated and monitored
- Only authorized Lambda functions can access the database
- All connections are encrypted in transit

## Outputs

The following outputs are available for use in Lambda function configuration:

```hcl
output "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "lambda_subnet_ids" {
  description = "Private subnet IDs for Lambda functions"
  value       = aws_subnet.private[*].id
}

output "lambda_configuration" {
  description = "Complete Lambda VPC configuration"
  value = {
    vpc_id                = aws_vpc.main.id
    lambda_security_group = aws_security_group.lambda.id
    private_subnet_ids    = aws_subnet.private[*].id
    rds_proxy_endpoint    = aws_db_proxy.main.endpoint
    rds_port              = aws_db_instance.postgres.port
    rds_database          = var.db_name
    rds_secret_arn        = aws_secretsmanager_secret.db_credentials.arn
  }
}
```

## Deployment

### Prerequisites

1. VPC and subnets must exist (created in Task 1)
2. RDS instance and security group must exist (created in Task 1)
3. Lambda IAM roles must exist (created in Task 4.1)

### Deploy VPC Configuration

```bash
cd infrastructure
terraform plan
terraform apply
```

### Verify Deployment

```bash
# Check Lambda security group
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw lambda_security_group_id)

# Check security group rules
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=$(terraform output -raw lambda_security_group_id)"

# Check VPC endpoints
aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)"
```

## Testing

### Test Lambda to RDS Connectivity

Once Lambda functions are deployed (Task 5), test connectivity:

```bash
# Invoke user management Lambda
aws lambda invoke \
  --function-name shoppulse-analytics-dev-user-management \
  --payload '{"httpMethod":"GET","path":"/users","requestContext":{"authorizer":{"claims":{"custom:tenant_id":"T001"}}}}' \
  response.json

# Check response
cat response.json
```

### Monitor Network Traffic

```bash
# View VPC Flow Logs
aws logs tail /aws/vpc/shoppulse-analytics-dev --follow

# Check Lambda CloudWatch Logs for connection errors
aws logs tail /aws/lambda/shoppulse-analytics-user-management --follow
```

## Troubleshooting

### Lambda Cannot Connect to RDS

**Symptoms**: Lambda times out or connection refused errors

**Checks**:
1. Verify Lambda is in private subnets:
   ```bash
   aws lambda get-function-configuration \
     --function-name shoppulse-analytics-dev-user-management \
     --query 'VpcConfig'
   ```

2. Verify security group rules:
   ```bash
   # Lambda egress to RDS
   aws ec2 describe-security-group-rules \
     --filters "Name=group-id,Values=$(terraform output -raw lambda_security_group_id)" \
     --query 'SecurityGroupRules[?ToPort==`5432`]'

   # Database ingress from Lambda
   aws ec2 describe-security-group-rules \
     --filters "Name=group-id,Values=$(terraform output -raw database_security_group_id)" \
     --query 'SecurityGroupRules[?FromPort==`5432`]'
   ```

3. Verify NAT Gateway is running:
   ```bash
   aws ec2 describe-nat-gateways \
     --filter "Name=vpc-id,Values=$(terraform output -raw vpc_id)"
   ```

4. Check RDS Proxy status:
   ```bash
   aws rds describe-db-proxies \
     --db-proxy-name shoppulse-analytics-dev-proxy
   ```

### Lambda Cannot Access AWS Services

**Symptoms**: Cognito or QuickSight API calls fail

**Checks**:
1. Verify Lambda has HTTPS egress rule:
   ```bash
   aws ec2 describe-security-group-rules \
     --filters "Name=group-id,Values=$(terraform output -raw lambda_security_group_id)" \
     --query 'SecurityGroupRules[?ToPort==`443`]'
   ```

2. Verify NAT Gateway has internet connectivity:
   ```bash
   # Check NAT Gateway route
   aws ec2 describe-route-tables \
     --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \
     --query 'RouteTables[?Routes[?NatGatewayId!=null]]'
   ```

3. Check VPC endpoint status (if using):
   ```bash
   aws ec2 describe-vpc-endpoints \
     --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \
     --query 'VpcEndpoints[*].[VpcEndpointId,State,ServiceName]'
   ```

### High NAT Gateway Costs

**Solution**: Deploy VPC endpoints for frequently used AWS services

Additional VPC endpoints to consider:
- `com.amazonaws.${region}.logs` - CloudWatch Logs
- `com.amazonaws.${region}.cognito-idp` - Cognito
- `com.amazonaws.${region}.quicksight` - QuickSight (if available)

## Cost Optimization

### NAT Gateway Costs

- **NAT Gateway**: ~$0.045/hour + $0.045/GB processed
- **Estimated monthly cost**: $32.40 + data transfer costs

### VPC Endpoint Costs

- **Interface Endpoint**: ~$0.01/hour per AZ + $0.01/GB processed
- **Estimated monthly cost per endpoint**: $14.40 + data transfer costs

**Recommendation**: Deploy VPC endpoints for services with high traffic volume (Secrets Manager, CloudWatch Logs) to reduce NAT Gateway data transfer costs.

## Next Steps

After completing Task 4.2, proceed to:

1. **Task 4.3**: Create shared database connection module
2. **Task 5**: Implement user management Lambda function with VPC configuration
3. **Task 6**: Implement QuickSight embed Lambda function with VPC configuration

## References

- [AWS Lambda VPC Networking](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
- [VPC Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- Requirements Document: `.kiro/specs/shoppulse-analytics/requirements.md`
- Design Document: `.kiro/specs/shoppulse-analytics/design.md`
