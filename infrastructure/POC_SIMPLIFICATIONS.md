# POC Infrastructure Simplifications

## Overview

This document outlines the cost-saving simplifications made to the ShopPulse Analytics infrastructure for POC/development purposes. These changes significantly reduce AWS costs while maintaining core functionality.

## Changes Made

### 1. RDS Made Publicly Accessible ✅
**Before:** RDS in isolated subnets, only accessible via VPC
**After:** RDS in public subnets with `publicly_accessible = true`

**Benefits:**
- Direct access from your local machine using username/password
- No need for VPN, bastion host, or SSH tunneling
- Easier database management and debugging

**Security Note:** 
- Security group allows access from `0.0.0.0/0` (anywhere)
- For production, restrict to specific IP addresses
- Still requires valid database credentials

**Connection String:**
```bash
psql -h <RDS_ENDPOINT> -U shoppulse_app -d shoppulse
# Password will be in Secrets Manager
```

### 2. RDS Proxy Removed ✅
**Before:** RDS Proxy for connection pooling (~$15/month)
**After:** Direct connections to RDS

**Cost Savings:** ~$15/month
**Impact:** 
- Lambda functions connect directly to RDS
- Connection pooling handled by application code (pg pool)
- Slightly higher cold start times, but acceptable for POC

### 3. NAT Gateway Removed ✅
**Before:** NAT Gateway for Lambda internet access (~$32/month + data transfer)
**After:** Lambda runs without VPC attachment

**Cost Savings:** ~$32-50/month
**Impact:**
- Lambda functions run in AWS-managed VPC
- Direct internet access for AWS API calls (Cognito, QuickSight, Secrets Manager)
- Can still connect to public RDS endpoint
- Faster cold starts (no ENI creation)

### 4. VPC Endpoints Removed ✅
**Before:** VPC endpoints for Secrets Manager (~$7/month)
**After:** Lambda uses public AWS API endpoints

**Cost Savings:** ~$7/month
**Impact:**
- Lambda calls AWS services over internet
- Slightly higher latency, but negligible for POC

### 5. Performance Insights Disabled ✅
**Before:** RDS Performance Insights enabled (~$3-5/month)
**After:** Disabled

**Cost Savings:** ~$3-5/month
**Impact:** Less detailed database performance metrics

### 6. CloudWatch Logs Reduced ✅
**Before:** PostgreSQL and upgrade logs exported to CloudWatch
**After:** No log exports

**Cost Savings:** ~$2-5/month
**Impact:** Fewer logs for debugging, but RDS still has basic logs

### 7. VPC Flow Logs Removed ✅
**Before:** VPC Flow Logs enabled (~$5-10/month)
**After:** Disabled

**Cost Savings:** ~$5-10/month
**Impact:** No network traffic analysis

## Total Monthly Cost Savings

| Item | Monthly Cost |
|------|--------------|
| RDS Proxy | ~$15 |
| NAT Gateway | ~$32 |
| NAT Data Transfer | ~$5-15 |
| VPC Endpoints | ~$7 |
| Performance Insights | ~$3-5 |
| CloudWatch Logs | ~$2-5 |
| VPC Flow Logs | ~$5-10 |
| **TOTAL SAVINGS** | **~$69-99/month** |

## Remaining Costs (Approximate)

| Item | Monthly Cost |
|------|--------------|
| RDS db.t3.micro | ~$15 |
| RDS Storage (100GB) | ~$12 |
| Cognito (free tier) | $0 |
| API Gateway (free tier) | $0 |
| Lambda (free tier) | $0 |
| Secrets Manager | ~$0.40 |
| **TOTAL** | **~$27-30/month** |

## Architecture Changes

### Before (Production-Ready)
```
Internet → API Gateway → Lambda (in VPC) → NAT Gateway → Internet (AWS APIs)
                              ↓
                         RDS Proxy → RDS (isolated subnet)
```

### After (POC)
```
Internet → API Gateway → Lambda (no VPC) → Internet (AWS APIs)
                              ↓
                         RDS (public subnet, publicly accessible)
```

## Lambda Configuration Changes

**Before:**
```hcl
vpc_config {
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.lambda.id]
}
```

**After:**
```hcl
# No vpc_config block - Lambda runs in AWS-managed VPC
```

## Database Connection Changes

**Before:**
```typescript
// Connect via RDS Proxy endpoint
host: aws_db_proxy.main.endpoint
```

**After:**
```typescript
// Connect directly to RDS
host: aws_db_instance.postgres.address
```

## Security Considerations for POC

### What's Still Secure ✅
- Database credentials in Secrets Manager
- SSL/TLS for database connections
- Cognito authentication for users
- API Gateway authorization
- IAM roles with least privilege

### What's Less Secure ⚠️
- RDS accessible from internet (mitigated by strong password)
- No network isolation for Lambda
- No VPC Flow Logs for traffic analysis

### Recommendations for Production
1. Move RDS back to private subnets
2. Add RDS Proxy for connection pooling
3. Add NAT Gateway for Lambda internet access
4. Restrict RDS security group to specific IPs
5. Enable Performance Insights
6. Enable CloudWatch Logs
7. Enable VPC Flow Logs
8. Consider Multi-AZ for RDS

## How to Connect to RDS

### From Local Machine
```bash
# Get credentials from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id shoppulse-dev-db-credentials \
  --query SecretString \
  --output text | jq -r

# Connect with psql
psql -h <RDS_ENDPOINT> -U shoppulse_app -d shoppulse -p 5432
```

### From Lambda
```typescript
// Lambda can connect directly - no VPC configuration needed
import { query } from './shared/db';

const result = await query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
```

## Deployment Commands

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Get RDS endpoint
terraform output rds_endpoint

# Get database password
aws secretsmanager get-secret-value \
  --secret-id $(terraform output -raw db_secret_arn) \
  --query SecretString \
  --output text | jq -r '.password'
```

## Reverting to Production Configuration

To restore production-ready configuration:

1. Set `publicly_accessible = false` in `database.tf`
2. Uncomment RDS Proxy resources in `database.tf`
3. Uncomment NAT Gateway in `vpc.tf`
4. Uncomment VPC endpoints in `lambda_vpc.tf`
5. Add VPC configuration to Lambda functions
6. Enable Performance Insights
7. Enable CloudWatch Logs
8. Enable VPC Flow Logs

## Notes

- This configuration is suitable for POC, development, and testing
- **DO NOT use in production** without proper security hardening
- Monitor costs in AWS Cost Explorer
- Consider using AWS Free Tier where applicable
- RDS endpoint will be publicly accessible - keep credentials secure
