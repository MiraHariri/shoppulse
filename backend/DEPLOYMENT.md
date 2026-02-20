# ShopPulse Backend Deployment Guide

This guide covers deploying the ShopPulse Analytics backend Lambda functions using the Serverless Framework.

## Prerequisites

1. **Node.js 18+** installed
2. **AWS CLI** configured with appropriate credentials
3. **Serverless Framework** installed globally (optional, can use npx)
4. **AWS Resources** already created:
   - Cognito User Pool
   - RDS PostgreSQL database
   - VPC with private subnets
   - Security groups for Lambda and RDS

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install Serverless Framework (if not already installed)

```bash
npm install -g serverless
```

Or use npx to run serverless commands without global installation:

```bash
npx serverless deploy
```

## Configuration

### 1. Create Environment File

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_ABC123XYZ

# RDS Database Configuration
RDS_HOST=shoppulse-db.c1a2b3c4d5e6.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_USERNAME=shoppulse_app
RDS_PASSWORD=YourSecurePassword123!

# VPC Configuration
LAMBDA_SECURITY_GROUP_ID=sg-0123456789abcdef0
LAMBDA_SUBNET_ID_1=subnet-0123456789abcdef0
LAMBDA_SUBNET_ID_2=subnet-0123456789abcdef1

# Deployment Stage
STAGE=dev
```

### 2. Load Environment Variables

**On Linux/Mac:**
```bash
export $(cat .env | xargs)
```

**On Windows (PowerShell):**
```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
```

**On Windows (CMD):**
```cmd
for /f "tokens=*" %i in (.env) do set %i
```

## Deployment

### Deploy to Development

```bash
npm run deploy:dev
```

Or with serverless directly:

```bash
serverless deploy --stage dev
```

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:prod
```

### Deploy with Custom Region

```bash
serverless deploy --stage prod --region us-west-2
```

## Deployment Output

After successful deployment, you'll see output like:

```
Service Information
service: shoppulse-backend
stage: dev
region: us-east-1
stack: shoppulse-backend-dev
resources: 15
api keys:
  None
endpoints:
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users
  POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}
  PUT - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}/role
  DELETE - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}
functions:
  userManagement: shoppulse-backend-dev-userManagement
```

Save the API Gateway endpoint URL - you'll need it for the frontend configuration.

## Testing the Deployment

### 1. Get a Cognito Access Token

First, authenticate a user to get an access token:

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id us-east-1_ABC123XYZ \
  --client-id YOUR_CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=YourPassword123!
```

### 2. Test List Users Endpoint

```bash
curl -X GET \
  https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Create User Endpoint

```bash
curl -X POST \
  https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "Finance"
  }'
```

## Viewing Logs

### Tail Lambda Logs

```bash
npm run logs
```

Or with serverless:

```bash
serverless logs -f userManagement -t
```

### View Logs in CloudWatch

```bash
aws logs tail /aws/lambda/dev-shoppulse-user-management --follow
```

## Local Development

### Run Locally with Serverless Offline

```bash
npm run offline
```

This starts a local API Gateway emulator at `http://localhost:3000`

**Note:** Local development requires:
- Database accessible from your machine
- Valid AWS credentials for Cognito operations
- Environment variables set

### Test Local Endpoint

```bash
curl -X GET http://localhost:3000/dev/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Updating the Deployment

### Update Function Code Only

```bash
serverless deploy function -f userManagement
```

This is faster than full deployment and only updates the Lambda function code.

### Full Redeployment

```bash
npm run deploy
```

## Rollback

### Rollback to Previous Deployment

```bash
serverless rollback -t TIMESTAMP
```

List available timestamps:

```bash
serverless deploy list
```

## Removing the Deployment

### Remove All Resources

```bash
npm run remove
```

Or:

```bash
serverless remove --stage dev
```

**Warning:** This deletes all Lambda functions, API Gateway, and CloudWatch logs. It does NOT delete:
- Cognito User Pool
- RDS Database
- VPC resources

## Troubleshooting

### Issue: Lambda Cannot Connect to RDS

**Solution:**
- Verify Lambda security group can access RDS security group on port 5432
- Verify Lambda is in private subnets with NAT Gateway for internet access
- Check RDS security group inbound rules

### Issue: Cognito Authorization Fails

**Solution:**
- Verify COGNITO_USER_POOL_ID is correct
- Check that the Cognito User Pool exists in the same region
- Verify the access token is valid and not expired

### Issue: Environment Variables Not Set

**Solution:**
- Ensure `.env` file exists and is properly formatted
- Load environment variables before deployment
- Check that all required variables are set

### Issue: VPC Timeout Errors

**Solution:**
- Lambda in VPC needs NAT Gateway for internet access (Cognito API calls)
- Verify NAT Gateway is configured in public subnets
- Check route tables for private subnets

### Issue: Permission Denied Errors

**Solution:**
- Verify AWS credentials have necessary permissions
- Check IAM role statements in serverless.yml
- Ensure AWS account has required service quotas

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Deploy to AWS
        run: |
          cd backend
          npm run deploy:prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}
          RDS_HOST: ${{ secrets.RDS_HOST }}
          RDS_USERNAME: ${{ secrets.RDS_USERNAME }}
          RDS_PASSWORD: ${{ secrets.RDS_PASSWORD }}
          LAMBDA_SECURITY_GROUP_ID: ${{ secrets.LAMBDA_SECURITY_GROUP_ID }}
          LAMBDA_SUBNET_ID_1: ${{ secrets.LAMBDA_SUBNET_ID_1 }}
          LAMBDA_SUBNET_ID_2: ${{ secrets.LAMBDA_SUBNET_ID_2 }}
```

## Monitoring

### CloudWatch Metrics

Monitor Lambda metrics in CloudWatch:
- Invocations
- Duration
- Errors
- Throttles
- Concurrent executions

### CloudWatch Alarms

Set up alarms for:
- Error rate > 5%
- Duration > 25 seconds (approaching timeout)
- Throttles > 0

### X-Ray Tracing

Enable X-Ray tracing in serverless.yml:

```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
```

## Cost Optimization

### Reserved Concurrency

Adjust reserved concurrency based on usage:

```yaml
functions:
  userManagement:
    reservedConcurrency: 50  # Lower for cost savings
```

### Memory Optimization

Test with different memory sizes to find optimal cost/performance:

```yaml
provider:
  memorySize: 256  # Start lower, increase if needed
```

### Log Retention

Reduce log retention to save costs:

```yaml
resources:
  Resources:
    UserManagementLogGroup:
      Properties:
        RetentionInDays: 7  # Reduce from 14 days
```

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use AWS Secrets Manager** for production credentials
3. **Enable VPC endpoints** for AWS services to avoid NAT Gateway costs
4. **Rotate database credentials** regularly
5. **Enable CloudTrail** for API audit logging
6. **Use least privilege IAM policies**
7. **Enable API Gateway request validation**
8. **Implement rate limiting** on API Gateway

## Support

For issues or questions:
- Check CloudWatch logs for error details
- Review AWS service quotas
- Verify all prerequisites are met
- Consult AWS documentation for service-specific issues
