# Integrated Deployment Guide
## Serverless Lambda + Terraform API Gateway

This guide explains how to deploy the ShopPulse backend using Serverless Framework for Lambda functions and Terraform for API Gateway integration.

## Architecture

- **Serverless Framework**: Deploys Lambda functions only (no API Gateway)
- **Terraform**: Manages API Gateway, integrations, and all AWS infrastructure
- **Integration**: Terraform automatically connects to Serverless-deployed Lambdas

## Benefits

✅ Single API Gateway with Cognito authorization  
✅ Centralized infrastructure management in Terraform  
✅ Fast Lambda deployments with Serverless  
✅ No duplicate API Gateways  
✅ Consistent endpoint URLs  

## Deployment Steps

### Step 1: Deploy Lambda with Serverless

```powershell
cd backend
npm run deploy:dev
```

This deploys the Lambda function: `dev-shoppulse-user-management`

**Note**: Serverless will NOT create an API Gateway. The Lambda is deployed standalone.

### Step 2: Integrate Lambda with API Gateway using Terraform

```powershell
cd ../infrastructure
terraform apply
```

Terraform will:
1. Detect the Serverless-deployed Lambda function
2. Create Lambda permissions for API Gateway
3. Create API Gateway integrations for all endpoints
4. Deploy the API Gateway
5. Create a stage with the invoke URL

### Step 3: Get the API Gateway URL

```powershell
terraform output api_gateway_invoke_url
```

Example output:
```
https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev
```

## Workflow

### Initial Deployment

```powershell
# 1. Deploy Lambda
cd backend
npm run deploy:dev

# 2. Integrate with API Gateway
cd ../infrastructure
terraform apply
```

### Update Lambda Code Only

When you only change Lambda code (no infrastructure changes):

```powershell
cd backend
npm run deploy:dev
```

That's it! The API Gateway integration remains unchanged.

### Update API Gateway Configuration

When you change API Gateway settings (routes, authorizers, etc.):

```powershell
cd infrastructure
terraform apply
```

### Update Both

```powershell
# 1. Update Lambda
cd backend
npm run deploy:dev

# 2. Update API Gateway (if needed)
cd ../infrastructure
terraform apply
```

## API Endpoints

All endpoints are protected by Cognito authorization:

```
Base URL: https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev

GET    /users              - List users
POST   /users              - Create user
GET    /users/{userId}     - Get user
PUT    /users/{userId}     - Update user
DELETE /users/{userId}     - Delete user
PUT    /users/{userId}/role - Update user role
```

## Configuration Files

### backend/serverless.yml

```yaml
functions:
  userManagement:
    handler: dist/userManagement/index.handler
    name: ${self:provider.stage}-shoppulse-user-management
    # No events - API Gateway integration done by Terraform
```

### infrastructure/lambda_api_integration.tf

- Detects Serverless-deployed Lambda
- Creates Lambda permissions
- Creates API Gateway integrations
- Deploys API Gateway with stage

## Environment Variables

### backend/.env

```env
COGNITO_USER_POOL_ID=us-east-1_7uHAvZn8K
RDS_HOST=shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_USERNAME=shoppulse_admin
RDS_PASSWORD=AkWoH4mTtfXOT899CtdsSjpErE02qkqQ
USER_MANAGEMENT_LAMBDA_ROLE_ARN=arn:aws:iam::249759897196:role/...
```

Serverless automatically loads this file with `useDotenv: true`.

## Troubleshooting

### Error: Lambda function not found

**Problem**: Terraform can't find the Lambda function.

**Solution**: Make sure you deployed the Lambda with Serverless first:
```powershell
cd backend
npm run deploy:dev
```

### Error: API Gateway deployment failed

**Problem**: Terraform deployment fails.

**Solution**: Check that the Lambda function name matches:
- Serverless deploys: `dev-shoppulse-user-management`
- Terraform expects: `${var.environment}-shoppulse-user-management`

Verify with:
```powershell
aws lambda list-functions --query "Functions[?contains(FunctionName, 'shoppulse')].FunctionName"
```

### Error: 403 Forbidden on API calls

**Problem**: API Gateway returns 403.

**Solution**: The Cognito authorizer is configured. You need a valid access token:
```powershell
aws cognito-idp admin-initiate-auth `
  --user-pool-id us-east-1_7uHAvZn8K `
  --client-id ggrhvt94hkcru9uqta7f4tjbk `
  --auth-flow ADMIN_NO_SRP_AUTH `
  --auth-parameters USERNAME=admin@example.com,PASSWORD=AdminPass123!
```

### Endpoints return 502 Bad Gateway

**Problem**: Lambda integration issue.

**Solution**: 
1. Check Lambda logs: `npm run logs`
2. Verify Lambda has correct environment variables
3. Test Lambda directly:
```powershell
aws lambda invoke --function-name dev-shoppulse-user-management response.json
```

## Cleanup

### Remove Lambda

```powershell
cd backend
serverless remove --stage dev
```

### Remove API Gateway Integration

```powershell
cd infrastructure
terraform destroy -target=aws_api_gateway_deployment.main
terraform destroy -target=aws_api_gateway_stage.main
```

### Remove Everything

```powershell
# Remove Lambda
cd backend
serverless remove --stage dev

# Remove all infrastructure
cd ../infrastructure
terraform destroy
```

## Advantages of This Approach

1. **Single Source of Truth**: All infrastructure in Terraform
2. **Fast Lambda Updates**: Use Serverless for quick code deployments
3. **Consistent API**: One API Gateway URL for all environments
4. **Cognito Integration**: Centralized authorization
5. **Easy Monitoring**: All logs in one place
6. **Cost Effective**: No duplicate API Gateways

## Next Steps

1. ✅ Deploy Lambda with Serverless
2. ✅ Integrate with Terraform
3. ⬜ Test all endpoints
4. ⬜ Add more Lambda functions (QuickSight embed, etc.)
5. ⬜ Configure frontend with API URL
6. ⬜ Set up CI/CD pipeline

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
      
      # Deploy Lambda
      - name: Deploy Lambda with Serverless
        run: |
          cd backend
          npm ci
          npm run deploy:prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      # Integrate with API Gateway
      - name: Integrate with Terraform
        run: |
          cd infrastructure
          terraform init
          terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Support

For issues:
- Check Lambda logs: `npm run logs`
- Check Terraform state: `terraform show`
- Verify API Gateway: AWS Console → API Gateway
- Test Lambda directly: AWS Console → Lambda → Test
