# Serverless Framework Setup Complete ✅

The ShopPulse backend is now configured for deployment using the Serverless Framework!

## What Was Added

### 1. Serverless Configuration (`serverless.yml`)
- Complete Lambda function definitions
- API Gateway REST API with Cognito authorizer
- VPC configuration for RDS access
- IAM roles with least privilege permissions
- CloudWatch logging
- CORS configuration
- Request validation

### 2. Deployment Scripts
- **deploy.ps1** - PowerShell deployment script for Windows
- **npm scripts** - `deploy:dev`, `deploy:staging`, `deploy:prod`
- Environment variable loading
- Build automation

### 3. Documentation
- **DEPLOYMENT.md** - Comprehensive deployment guide
- **README.md** - Project overview and quick start
- **.env.example** - Environment variables template

### 4. Dependencies
- `serverless` - Serverless Framework CLI
- `serverless-offline` - Local development plugin

## Quick Start

### Step 1: Configure Environment

```powershell
# Copy the template
Copy-Item .env.example .env

# Edit .env with your values
notepad .env
```

### Step 2: Deploy

**Option A: Using PowerShell Script (Recommended for Windows)**
```powershell
.\deploy.ps1 -Stage dev
```

**Option B: Using npm**
```powershell
# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Deploy
npm run deploy:dev
```

**Option C: Using Serverless CLI directly**
```powershell
# Load environment variables first (see Option B)
serverless deploy --stage dev
```

## What Gets Deployed

When you run the deployment, Serverless will create:

1. **Lambda Function** - `dev-shoppulse-user-management`
   - Runtime: Node.js 18.x
   - Memory: 512 MB
   - Timeout: 30 seconds
   - VPC: Connected to your private subnets

2. **API Gateway REST API**
   - Cognito User Pool authorizer
   - 5 endpoints (GET, POST, PUT, DELETE)
   - CORS enabled
   - Request validation

3. **IAM Role**
   - Cognito permissions (AdminCreateUser, AdminUpdateUserAttributes, etc.)
   - CloudWatch Logs permissions
   - VPC network interface permissions

4. **CloudWatch Log Group**
   - Log retention: 14 days
   - Automatic log streaming

## Deployment Output

After successful deployment, you'll see:

```
✔ Service deployed to stack dev-shoppulse-backend (123s)

endpoints:
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users
  POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}
  PUT - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}/role
  DELETE - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/users/{userId}

functions:
  userManagement: dev-shoppulse-user-management (5.2 MB)
```

**Save the API Gateway URL!** You'll need it for:
- Frontend configuration
- Testing the API
- Integration with other services

## Testing the Deployment

### 1. Get Access Token

```powershell
aws cognito-idp admin-initiate-auth `
  --user-pool-id $env:COGNITO_USER_POOL_ID `
  --client-id YOUR_CLIENT_ID `
  --auth-flow ADMIN_NO_SRP_AUTH `
  --auth-parameters USERNAME=admin@example.com,PASSWORD=YourPassword123!
```

### 2. Test List Users

```powershell
$token = "YOUR_ACCESS_TOKEN"
$apiUrl = "https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev"

Invoke-RestMethod -Uri "$apiUrl/users" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
  }
```

### 3. Test Create User

```powershell
$body = @{
  email = "newuser@example.com"
  password = "SecurePass123!"
  role = "Finance"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$apiUrl/users" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

## Viewing Logs

### Real-time Logs

```powershell
npm run logs
```

Or:

```powershell
serverless logs -f userManagement -t
```

### CloudWatch Logs

```powershell
aws logs tail /aws/lambda/dev-shoppulse-user-management --follow
```

## Local Development

Run the API locally:

```powershell
npm run offline
```

This starts a local server at `http://localhost:3000`

**Note:** You still need:
- Valid AWS credentials for Cognito
- Database connection (RDS or local PostgreSQL)
- Environment variables set

## Updating the Deployment

### Update Function Code Only (Fast)

```powershell
serverless deploy function -f userManagement
```

### Full Redeployment

```powershell
npm run deploy:dev
```

## Removing the Deployment

```powershell
npm run remove
```

Or:

```powershell
serverless remove --stage dev
```

## Cost Estimate

**Lambda:**
- Free tier: 1M requests/month, 400,000 GB-seconds
- After free tier: ~$0.20 per 1M requests
- Memory: 512 MB = ~$0.0000083 per second

**API Gateway:**
- Free tier: 1M requests/month (first 12 months)
- After free tier: ~$3.50 per 1M requests

**CloudWatch Logs:**
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB/month

**Estimated monthly cost for low traffic:**
- < 100K requests/month: **$0** (within free tier)
- 1M requests/month: **~$5-10**

## Next Steps

1. ✅ Deploy the backend
2. ⬜ Test all endpoints
3. ⬜ Configure frontend with API URL
4. ⬜ Set up monitoring and alarms
5. ⬜ Configure CI/CD pipeline
6. ⬜ Deploy to staging/production

## Troubleshooting

### Common Issues

**Issue: "Cannot find module 'serverless'"**
```powershell
npm install
```

**Issue: "Missing environment variable"**
```powershell
# Verify .env file exists and is complete
Get-Content .env
```

**Issue: "VPC timeout"**
- Lambda needs NAT Gateway for internet access (Cognito API)
- Check NAT Gateway is in public subnet
- Verify route tables

**Issue: "Access denied"**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions for CloudFormation, Lambda, API Gateway

## Resources

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [API Gateway Docs](https://docs.aws.amazon.com/apigateway/)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project README](./README.md)

## Support

For issues:
1. Check CloudWatch logs: `npm run logs`
2. Review deployment output for errors
3. Verify all environment variables are set
4. Check AWS service quotas and limits
5. Review [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
