# ShopPulse Analytics - Deployment Guide

Complete deployment guide for Task 1: PostgreSQL Database Schema and Infrastructure

## Overview

This guide covers the deployment of:
- AWS VPC with public, private, and isolated subnets
- PostgreSQL 15.4 RDS instance
- RDS Proxy for connection pooling
- AWS Secrets Manager for credential storage
- Database schema with 8 tables
- Auto-update triggers
- Sample seed data

## Prerequisites

### Required Tools

```bash
# Terraform
terraform version  # Should be 1.0+

# AWS CLI
aws --version  # Should be 2.x

# PostgreSQL client
psql --version  # Should be 12+

# jq for JSON parsing
jq --version
```

**Install Terraform on Windows:**
```bash
# Using Chocolatey
choco install terraform

# Or download from https://www.terraform.io/downloads
```

### AWS Configuration

```bash
# Configure AWS credentials
aws configure

# Verify credentials
aws sts get-caller-identity

# Set default region (if not already set)
export AWS_DEFAULT_REGION=us-east-1
```

## Step-by-Step Deployment

### Step 1: Setup Terraform

```bash
# Navigate to infrastructure directory
cd infrastructure

# Copy example variables
copy terraform.tfvars.example terraform.tfvars

# Edit variables (optional - defaults work for dev)
notepad terraform.tfvars

# Initialize Terraform
terraform init
```

### Step 2: Review Infrastructure Plan

```bash
# Review what will be created
terraform plan
```

Expected resources:
- VPC with 6 subnets (2 public, 2 private, 2 isolated)
- Internet Gateway and NAT Gateway
- RDS PostgreSQL instance (db.t3.medium)
- RDS Proxy
- Secrets Manager secret
- Security groups
- CloudWatch Log Groups

### Step 3: Deploy Infrastructure

```bash
# Deploy all resources
terraform apply

# Type 'yes' when prompted
```

**Deployment time:** 10-15 minutes (RDS instance creation is the longest step)

You can monitor progress in the AWS Console or watch the Terraform output.

### Step 4: Verify Deployment

```bash
# View all outputs
terraform output

# Verify VPC creation
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=shoppulse-analytics-vpc"
```

### Step 5: Retrieve Connection Details

```bash
# Get all outputs
terraform output

# Save specific values (PowerShell)
$DB_ENDPOINT = terraform output -raw database_proxy_endpoint
$DB_SECRET_ARN = terraform output -raw database_secret_arn
$DB_SECURITY_GROUP = terraform output -raw database_security_group_id

# Verify values
Write-Host "Database Endpoint: $DB_ENDPOINT"
Write-Host "Secret ARN: $DB_SECRET_ARN"
Write-Host "Security Group: $DB_SECURITY_GROUP"
```

### Step 6: Initialize Database Schema

```bash
# Navigate to database directory
cd ../database

# Set environment variables (PowerShell)
$env:DB_HOST = $DB_ENDPOINT
$env:DB_SECRET_ARN = $DB_SECRET_ARN

# Run initialization script (requires bash/WSL on Windows)
bash init-database.sh

# Or use Git Bash if installed
```

The script will:
1. ✓ Retrieve credentials from Secrets Manager
2. ✓ Test database connection
3. ✓ Create database 'shoppulse' (if needed)
4. ✓ Run schema creation (8 tables)
5. ✓ Create indexes and triggers
6. ? Ask if you want to load seed data (recommended for testing)
7. ✓ Verify table and trigger creation

Expected output:
```
ShopPulse Analytics - Database Initialization
================================================
✓ Credentials retrieved successfully
✓ Database connection successful
✓ Database already exists
✓ Schema created successfully
Do you want to load seed data? (y/n) y
✓ Seed data loaded successfully
✓ Found 8 tables in the database
✓ Found 7 triggers
================================================
Database initialization completed successfully!
================================================
```

### Step 7: Verify Database Setup

```bash
# Retrieve credentials
DB_CREDS=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString --output text)
DB_USER=$(echo $DB_CREDS | jq -r '.username')
DB_PASS=$(echo $DB_CREDS | jq -r '.password')

# Connect to database
export PGPASSWORD=$DB_PASS
psql -h $DB_ENDPOINT -U $DB_USER -d shoppulse

# Run verification queries
\dt                                    # List tables
\di                                    # List indexes
SELECT * FROM tenants;                 # View sample data
SELECT COUNT(*) FROM users;            # Check if empty
\q                                     # Exit
```

## Verification Checklist

- [ ] VPC created with 6 subnets
- [ ] RDS instance is available
- [ ] RDS Proxy is available
- [ ] Secrets Manager contains credentials
- [ ] Database 'shoppulse' exists
- [ ] 8 tables created (tenants, users, orders, fulfillment, marketing_campaigns, role_metric_visibility, governance_rules, audit_logs)
- [ ] Indexes created on tenant_id columns
- [ ] 7 triggers created for updated_at columns
- [ ] Seed data loaded (3 tenants, role visibility rules)
- [ ] Can connect via RDS Proxy endpoint

## Configuration for Lambda Functions

After successful deployment, use these values in Lambda environment variables:

```bash
# Get Lambda configuration from Terraform
terraform output lambda_configuration

# Or print formatted (PowerShell)
Write-Host "Lambda Environment Variables:"
Write-Host "RDS_PROXY_ENDPOINT=$(terraform output -raw database_proxy_endpoint)"
Write-Host "RDS_PORT=5432"
Write-Host "RDS_DATABASE=shoppulse"
Write-Host "RDS_SECRET_ARN=$(terraform output -raw database_secret_arn)"
Write-Host ""
Write-Host "Lambda VPC Configuration:"
Write-Host "VPC_ID=$(terraform output -raw vpc_id)"
Write-Host "SECURITY_GROUP_ID=$(terraform output -raw database_security_group_id)"
Write-Host "SUBNET_IDS=$(terraform output -json private_subnet_ids)"
```

## Monitoring and Maintenance

### CloudWatch Metrics

Monitor these metrics in CloudWatch:

```bash
# View database connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=<instance-id> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### CloudWatch Logs

```bash
# View PostgreSQL logs
aws logs tail /aws/rds/instance/<instance-id>/postgresql --follow

# View RDS Proxy logs
aws logs tail /aws/rds/proxy/shoppulse-analytics-proxy --follow
```

### Performance Insights

Access Performance Insights in AWS Console:
1. Navigate to RDS → Databases → Your Instance
2. Click "Performance Insights" tab
3. View top SQL queries and wait events

## Troubleshooting

### Issue: Cannot connect to database

```bash
# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier <instance-id> \
  --query 'DBInstances[0].DBInstanceStatus'

# Check security group rules
aws ec2 describe-security-groups --group-ids $DB_SECURITY_GROUP

# Test connection
psql -h $DB_ENDPOINT -U $DB_USER -d postgres -c "SELECT 1;"
```

### Issue: Schema creation fails

```bash
# Check if database exists
psql -h $DB_ENDPOINT -U $DB_USER -d postgres -c "\l"

# Check for existing tables
psql -h $DB_ENDPOINT -U $DB_USER -d shoppulse -c "\dt"

# Drop and recreate if needed
psql -h $DB_ENDPOINT -U $DB_USER -d shoppulse -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Issue: Triggers not working

```bash
# Check trigger status
psql -h $DB_ENDPOINT -U $DB_USER -d shoppulse -c "SELECT * FROM information_schema.triggers WHERE trigger_schema='public';"

# Test trigger manually
psql -h $DB_ENDPOINT -U $DB_USER -d shoppulse << EOF
UPDATE tenants SET tenant_name = 'Test Update' WHERE tenant_id = 'T001';
SELECT tenant_id, tenant_name, updated_at FROM tenants WHERE tenant_id = 'T001';
EOF
```

## Cost Estimate

Monthly costs for this infrastructure:

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| RDS db.t3.medium | 2 vCPU, 4 GB RAM | ~$60 |
| GP3 Storage | 100 GB | ~$12 |
| RDS Proxy | Connection pooling | ~$15 |
| NAT Gateway | 1 gateway | ~$32 |
| Secrets Manager | 1 secret | ~$0.40 |
| **Total** | | **~$119** |

To reduce costs for development:
- Use db.t3.small (~$30/month)
- Reduce storage to 20 GB (~$2.40/month)
- Stop RDS instance when not in use

## Cleanup

To remove all infrastructure:

```bash
# WARNING: This will delete all data!

# Create a final snapshot (optional)
aws rds create-db-snapshot \
  --db-instance-identifier shoppulse-analytics-db \
  --db-snapshot-identifier final-snapshot-$(Get-Date -Format "yyyyMMdd")

# Destroy infrastructure
cd infrastructure
terraform destroy

# Type 'yes' when prompted to confirm
```

## Next Steps

After completing Task 1:

1. **Task 2**: Set up AWS Cognito User Pool
   - Create User Pool with custom attributes (tenant_id, role)
   - Configure password policy
   - Set token expiration

2. **Task 3**: Set up AWS API Gateway
   - Create REST API with Cognito authorizer
   - Configure CORS
   - Set up request validation

3. **Task 4**: Implement Lambda infrastructure
   - Create Lambda execution roles
   - Configure VPC settings
   - Create database connection module

4. **Task 5**: Implement user management Lambda
   - Connect to database via RDS Proxy
   - Implement CRUD operations
   - Add tenant_id filtering

## Support and Documentation

- Infrastructure README: `infrastructure/README.md`
- Database README: `database/README.md`
- Schema SQL: `database/schema.sql`
- Seed Data: `database/seed-data.sql`
- Init Script: `database/init-database.sh`

## Requirements Validation

This deployment satisfies the following requirements:

- ✓ **Requirement 15.1**: Database includes tenant_id column in all tenant-specific tables
- ✓ **Requirement 15.2**: Indexes created on tenant_id columns for query performance
- ✓ **Requirement 15.3**: Foreign key constraints include tenant_id for referential integrity
- ✓ **Requirement 15.5**: Database stores user-role mappings, governance rules, and audit logs with tenant_id

Task 1 is now complete! The PostgreSQL database infrastructure is ready for Lambda function integration.
