# Task 4.2 Summary: Lambda VPC Configuration

## Task Completion

✅ **Task 4.2: Set up Lambda VPC configuration** - COMPLETED

**Requirements Addressed**: 2.2 (Strict Tenant Data Isolation - Backend Service queries RDS)

## What Was Implemented

### 1. Lambda Security Group (`lambda_vpc.tf`)

Created a dedicated security group for Lambda functions with least-privilege network access:

**Resource**: `aws_security_group.lambda`
- **Name**: `shoppulse-analytics-dev-lambda-sg`
- **Purpose**: Controls network access for all Lambda functions

**Egress Rules**:
- **PostgreSQL (5432)**: Allow Lambda to connect to RDS database security group
- **HTTPS (443)**: Allow Lambda to make AWS API calls (Cognito, QuickSight, Secrets Manager)

### 2. Database Security Group Rules

Added ingress rule to allow Lambda functions to connect to RDS:

**Resource**: `aws_security_group_rule.database_ingress_lambda`
- **Protocol**: TCP
- **Port**: 5432
- **Source**: Lambda security group
- **Description**: "Allow Lambda functions to connect to RDS"

### 3. VPC Endpoints (Performance Optimization)

Created VPC endpoint for Secrets Manager to improve performance and reduce NAT Gateway costs:

**Resource**: `aws_vpc_endpoint.secrets_manager`
- **Type**: Interface endpoint
- **Service**: `com.amazonaws.us-east-1.secretsmanager`
- **Subnets**: Private subnets (where Lambda runs)
- **Private DNS**: Enabled
- **Benefit**: Lambda can access Secrets Manager without NAT Gateway traversal

**Resource**: `aws_security_group.vpc_endpoints`
- **Purpose**: Controls access to VPC endpoints
- **Ingress**: Port 443 from Lambda security group

### 4. Updated Outputs

Enhanced `outputs.tf` with Lambda-specific configuration:

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

## Network Architecture

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

## Security Implementation

### Defense in Depth

This VPC configuration implements network-level security as part of the multi-layered security approach:

1. ✅ **Network Layer** (this task): Security groups and subnet isolation
2. ⏳ **Application Layer**: Tenant ID validation in Lambda code (Task 5, 6)
3. ⏳ **Database Layer**: Tenant ID in all queries (Task 5, 6)
4. ✅ **Authentication Layer**: Cognito JWT tokens with tenant_id claim (Task 2)

### Least Privilege Network Access

- Lambda functions can ONLY connect to:
  - RDS database on port 5432
  - AWS services via HTTPS (port 443)
- Lambda functions have NO direct internet access (must go through NAT Gateway)
- RDS database accepts connections ONLY from Lambda security group
- RDS database is in isolated subnets with NO internet access

### Network Isolation

- **Lambda in Private Subnets**: No direct internet access
- **Database in Isolated Subnets**: No internet access at all
- **Security Groups**: Implement least-privilege access control
- **VPC Flow Logs**: All network traffic is logged for audit

## Files Created

1. **`infrastructure/lambda_vpc.tf`** - Lambda VPC configuration
   - Lambda security group
   - Security group rules for Lambda ↔ RDS communication
   - VPC endpoints for AWS services
   - VPC endpoints security group

2. **`infrastructure/LAMBDA_VPC_SETUP.md`** - Comprehensive documentation
   - Architecture diagrams
   - Component descriptions
   - Deployment instructions
   - Troubleshooting guide
   - Cost optimization recommendations

3. **`infrastructure/TASK_4.2_SUMMARY.md`** - This summary document

## Files Modified

1. **`infrastructure/outputs.tf`** - Added Lambda-specific outputs
   - `lambda_security_group_id`
   - `lambda_subnet_ids`
   - Updated `lambda_configuration` output

## Validation

### Terraform Validation

```bash
$ terraform validate
Success! The configuration is valid.
```

### Terraform Plan

```bash
$ terraform plan
Plan: 106 to add, 0 to change, 0 to destroy.
```

Key resources to be created:
- ✅ `aws_security_group.lambda` - Lambda security group
- ✅ `aws_security_group_rule.lambda_egress_rds` - Lambda → RDS egress
- ✅ `aws_security_group_rule.lambda_egress_https` - Lambda → AWS services egress
- ✅ `aws_security_group_rule.database_ingress_lambda` - RDS ingress from Lambda
- ✅ `aws_vpc_endpoint.secrets_manager` - Secrets Manager VPC endpoint
- ✅ `aws_security_group.vpc_endpoints` - VPC endpoints security group

## Lambda Function Configuration

When creating Lambda functions (Tasks 5 and 6), use this VPC configuration:

```hcl
resource "aws_lambda_function" "example" {
  # ... other configuration ...

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # IAM role must include AWSLambdaVPCAccessExecutionRole (already configured in Task 4.1)
}
```

## Requirements Validation

### Requirement 2.2: Backend Service Queries RDS

✅ **Network connectivity established**: Lambda functions can securely connect to RDS PostgreSQL

**Implementation**:
- Lambda security group allows egress to RDS on port 5432
- Database security group allows ingress from Lambda on port 5432
- Lambda functions deployed in private subnets with NAT Gateway access
- VPC endpoints reduce latency and cost for AWS service calls

**Next Steps** (Tasks 5 and 6):
- Implement tenant_id validation in Lambda code
- Include tenant_id in all database queries
- Use RDS Proxy endpoint for connection pooling

## Cost Considerations

### NAT Gateway
- **Cost**: ~$0.045/hour + $0.045/GB processed
- **Monthly estimate**: $32.40 + data transfer costs
- **Required for**: Lambda to access AWS services (Cognito, QuickSight)

### VPC Endpoints
- **Secrets Manager endpoint**: ~$0.01/hour per AZ + $0.01/GB processed
- **Monthly estimate**: $14.40 + data transfer costs
- **Benefit**: Reduces NAT Gateway data transfer costs for Secrets Manager calls

### Optimization Recommendations

Consider adding VPC endpoints for:
- CloudWatch Logs (`com.amazonaws.us-east-1.logs`) - High traffic volume
- Cognito (`com.amazonaws.us-east-1.cognito-idp`) - If available in region
- QuickSight - If available as VPC endpoint

## Deployment

### Prerequisites

✅ All prerequisites met:
1. ✅ VPC and subnets exist (Task 1)
2. ✅ RDS instance and security group exist (Task 1)
3. ✅ Lambda IAM roles exist (Task 4.1)

### Deploy Command

```bash
cd infrastructure
terraform apply tfplan
```

### Verification Commands

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

## Testing Plan

Once Lambda functions are deployed (Tasks 5 and 6):

1. **Test Lambda to RDS connectivity**:
   - Invoke user management Lambda
   - Verify database connection succeeds
   - Check CloudWatch Logs for connection errors

2. **Test Lambda to AWS services**:
   - Invoke QuickSight embed Lambda
   - Verify Cognito API calls succeed
   - Verify QuickSight API calls succeed

3. **Monitor network traffic**:
   - Review VPC Flow Logs
   - Check Lambda CloudWatch Logs
   - Verify no connection timeouts

## Troubleshooting Guide

See `infrastructure/LAMBDA_VPC_SETUP.md` for detailed troubleshooting:

- Lambda cannot connect to RDS
- Lambda cannot access AWS services
- High NAT Gateway costs
- VPC endpoint issues

## Next Steps

After completing Task 4.2, proceed to:

1. ✅ **Task 4.1**: Lambda IAM roles (COMPLETED)
2. ✅ **Task 4.2**: Lambda VPC configuration (COMPLETED)
3. ⏳ **Task 4.3**: Create shared database connection module
4. ⏳ **Task 5**: Implement user management Lambda function
5. ⏳ **Task 6**: Implement QuickSight embed Lambda function

## References

- Requirements Document: `.kiro/specs/shoppulse-analytics/requirements.md`
- Design Document: `.kiro/specs/shoppulse-analytics/design.md`
- Task List: `.kiro/specs/shoppulse-analytics/tasks.md`
- Lambda IAM Setup: `infrastructure/LAMBDA_IAM_SETUP.md`
- Lambda VPC Setup: `infrastructure/LAMBDA_VPC_SETUP.md`

## Compliance

✅ **Requirement 2.2**: Network connectivity for Backend Service to query RDS database
✅ **Security best practices**: Least-privilege network access, defense in depth
✅ **AWS best practices**: VPC endpoints, private subnets, security groups
✅ **Cost optimization**: VPC endpoints to reduce NAT Gateway costs

---

**Task Status**: ✅ COMPLETED  
**Date**: 2024  
**Implemented by**: Kiro AI Assistant
