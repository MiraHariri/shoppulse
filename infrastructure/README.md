# ShopPulse Analytics Infrastructure

This directory contains AWS CDK infrastructure code for deploying the ShopPulse Analytics platform.

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- PostgreSQL client tools (psql) for database initialization
- jq for JSON parsing

## Infrastructure Components

### VPC Stack
- VPC with public, private, and isolated subnets across 2 availability zones
- NAT Gateway for private subnet internet access
- VPC Flow Logs for security monitoring

### Database Stack
- PostgreSQL 15.4 RDS instance (db.t3.medium)
- 100GB GP3 storage
- RDS Proxy for connection pooling
- AWS Secrets Manager for credential storage
- Security groups for network isolation
- Performance Insights enabled
- CloudWatch Logs integration

## Deployment Instructions

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### 3. Review Infrastructure Changes

```bash
npm run synth
npm run diff
```

### 4. Deploy VPC Stack

```bash
npm run deploy:vpc
```

This will create:
- VPC with CIDR 10.0.0.0/16
- Public, private, and isolated subnets
- Internet Gateway and NAT Gateway
- Route tables and VPC Flow Logs

### 5. Deploy Database Stack

```bash
npm run deploy:database
```

This will create:
- PostgreSQL RDS instance
- RDS Proxy for connection pooling
- Database credentials in Secrets Manager
- Security groups for database access

**Note:** Database deployment takes approximately 10-15 minutes.

### 6. Retrieve Database Connection Details

After deployment, retrieve the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name ShopPulseDatabaseStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

Key outputs:
- `DatabaseEndpoint`: RDS instance endpoint
- `DatabaseProxyEndpoint`: RDS Proxy endpoint (use this for Lambda connections)
- `DatabaseSecretArn`: ARN of the credentials secret
- `DatabaseSecurityGroupId`: Security group ID for database access

### 7. Initialize Database Schema

Set environment variables and run the initialization script:

```bash
export DB_HOST=$(aws cloudformation describe-stacks \
  --stack-name ShopPulseDatabaseStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseProxyEndpoint`].OutputValue' \
  --output text)

export DB_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name ShopPulseDatabaseStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
  --output text)

cd ../database
chmod +x init-database.sh
./init-database.sh
```

This script will:
- Retrieve database credentials from Secrets Manager
- Create the database if it doesn't exist
- Run the schema creation script (8 tables + triggers)
- Optionally load seed data
- Verify table and trigger creation

## Database Configuration

### Connection Details

- **Engine**: PostgreSQL 15.4
- **Instance Type**: db.t3.medium (2 vCPU, 4 GB RAM)
- **Storage**: 100 GB GP3
- **Multi-AZ**: Disabled (as per requirements)
- **Backup**: Disabled (as per requirements)
- **Encryption**: Enabled (at rest)
- **TLS**: Required for connections

### RDS Proxy Configuration

- **Max Connections**: 100% of instance capacity
- **Max Idle Connections**: 50%
- **Idle Client Timeout**: 30 minutes
- **TLS**: Required

### Security

- Database is in isolated subnets (no internet access)
- Security group restricts access to Lambda functions only
- Credentials stored in AWS Secrets Manager
- Automatic credential rotation supported
- All connections require TLS

## Database Schema

The database includes 8 tables:

1. **tenants** - Tenant organization data
2. **users** - User accounts with Cognito integration
3. **orders** - E-commerce order data
4. **fulfillment** - Order fulfillment and shipping data
5. **marketing_campaigns** - Marketing campaign performance
6. **role_metric_visibility** - Role-based metric access control
7. **governance_rules** - Tenant-level data governance rules
8. **audit_logs** - Audit trail for all operations

All tables include:
- `tenant_id` column for multi-tenant isolation
- Indexes on `tenant_id` for query performance
- `created_at` and `updated_at` timestamps
- Auto-update triggers for `updated_at` columns

## Lambda Integration

### Environment Variables

Lambda functions should use these environment variables:

```typescript
{
  RDS_PROXY_ENDPOINT: "<DatabaseProxyEndpoint>",
  RDS_PORT: "5432",
  RDS_DATABASE: "shoppulse",
  RDS_SECRET_ARN: "<DatabaseSecretArn>"
}
```

### Security Group Configuration

Lambda functions must be in the same VPC and have the database security group attached to allow connections.

### Connection Pooling

Always use the RDS Proxy endpoint for Lambda connections to benefit from:
- Connection pooling and reuse
- Reduced connection overhead
- Better handling of Lambda scaling
- Automatic failover support

## Monitoring

### CloudWatch Metrics

Monitor these key metrics:

- `DatabaseConnections` - Active database connections
- `CPUUtilization` - Database CPU usage
- `FreeableMemory` - Available memory
- `ReadLatency` / `WriteLatency` - Query performance
- `ProxyConnections` - RDS Proxy connection count

### CloudWatch Logs

Database logs are exported to CloudWatch:
- PostgreSQL logs: `/aws/rds/instance/shoppulse-analytics/postgresql`
- Upgrade logs: `/aws/rds/instance/shoppulse-analytics/upgrade`

### Performance Insights

Performance Insights is enabled for query performance analysis:
- View top SQL queries
- Analyze wait events
- Identify performance bottlenecks

## Maintenance

### Backup and Recovery

While automated backups are disabled per requirements, you can:

1. **Manual Snapshots**:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier <instance-id> \
  --db-snapshot-identifier shoppulse-manual-snapshot-$(date +%Y%m%d)
```

2. **Restore from Snapshot**:
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier shoppulse-restored \
  --db-snapshot-identifier <snapshot-id>
```

### Scaling

To scale the database:

1. Update `instanceType` in `database-stack.ts`
2. Run `npm run deploy:database`
3. CDK will perform a rolling update with minimal downtime

### Credential Rotation

To rotate database credentials:

```bash
aws secretsmanager rotate-secret \
  --secret-id <DatabaseSecretArn> \
  --rotation-lambda-arn <rotation-lambda-arn>
```

## Cost Optimization

Current configuration costs (approximate):

- RDS db.t3.medium: ~$60/month
- 100 GB GP3 storage: ~$12/month
- RDS Proxy: ~$15/month
- NAT Gateway: ~$32/month
- **Total**: ~$119/month

To reduce costs:
- Use db.t3.small for development ($30/month)
- Reduce storage to 20 GB for testing ($2.40/month)
- Stop RDS instance when not in use (development only)

## Troubleshooting

### Connection Issues

1. **Verify security group rules**:
```bash
aws ec2 describe-security-groups \
  --group-ids <DatabaseSecurityGroupId>
```

2. **Test connection from Lambda**:
```bash
aws lambda invoke \
  --function-name test-db-connection \
  --payload '{}' \
  response.json
```

3. **Check RDS Proxy logs**:
```bash
aws logs tail /aws/rds/proxy/shoppulse-analytics-proxy --follow
```

### Schema Issues

1. **Verify tables exist**:
```bash
psql -h $DB_HOST -U $DB_USERNAME -d shoppulse -c "\dt"
```

2. **Check trigger status**:
```bash
psql -h $DB_HOST -U $DB_USERNAME -d shoppulse -c "SELECT * FROM information_schema.triggers;"
```

3. **Verify indexes**:
```bash
psql -h $DB_HOST -U $DB_USERNAME -d shoppulse -c "\di"
```

## Cleanup

To destroy all infrastructure:

```bash
npm run destroy
```

**Warning**: This will delete the database and all data. Create a snapshot first if needed.

## Next Steps

After database setup:

1. Deploy Cognito User Pool (Task 2)
2. Deploy API Gateway (Task 3)
3. Deploy Lambda functions (Tasks 4-7)
4. Configure Lambda VPC and security groups for database access
5. Test end-to-end connectivity

## Support

For issues or questions:
- Review CloudWatch Logs for error messages
- Check AWS RDS console for instance status
- Verify security group and network configuration
- Ensure Lambda functions have correct IAM permissions
