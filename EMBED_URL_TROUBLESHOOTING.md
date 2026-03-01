# Embed URL Troubleshooting Guide

## Problem
Cannot call the QuickSight embed URL endpoint at `/dashboards/embed-url`

## Root Causes Identified

### 1. API Gateway Not Deployed (CRITICAL)
The API Gateway deployment and stage resources are commented out in `infrastructure/api_gateway.tf`.

**Location:** Lines 24-82 in `infrastructure/api_gateway.tf`

**Impact:** Even though the API Gateway resources, methods, and integrations are defined, they haven't been deployed to a stage, so the endpoint is not accessible.

### 2. Lambda Function May Not Be Deployed
The QuickSight embed Lambda function needs to be deployed before Terraform can reference it.

**Expected Function Name:** `dev-shoppulse-quicksight-embed`

## Solution Steps

### Step 1: Deploy the Lambda Function

```bash
# Navigate to backend directory
cd backend

# Build TypeScript code
npm run build

# Deploy using Serverless Framework
npx serverless deploy --stage dev --region us-east-1
```

### Step 2: Verify Lambda Deployment

```bash
# Check if Lambda function exists
aws lambda get-function --function-name dev-shoppulse-quicksight-embed --region us-east-1
```

### Step 3: Uncomment API Gateway Deployment in Terraform

Edit `infrastructure/api_gateway.tf` and uncomment:
- `aws_api_gateway_deployment.main` (lines ~24-42)
- `aws_api_gateway_stage.main` (lines ~44-68)
- `aws_api_gateway_method_settings.all` (lines ~70-82)
- `aws_api_gateway_usage_plan.main` (lines ~84-100)

### Step 4: Apply Terraform Changes

```bash
cd infrastructure

# Initialize Terraform (if needed)
terraform init

# Plan the changes
terraform plan

# Apply the changes
terraform apply
```

### Step 5: Test the Endpoint

```bash
# Get your Cognito token first (login through the app or use AWS CLI)
# Then test the endpoint

curl -X GET \
  https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/dashboards/embed-url \
  -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
```

## Quick Verification Checklist

- [ ] Lambda function `dev-shoppulse-quicksight-embed` is deployed
- [ ] Lambda has correct IAM role with QuickSight permissions
- [ ] API Gateway deployment resource is uncommented
- [ ] API Gateway stage resource is uncommented
- [ ] Terraform apply completed successfully
- [ ] API Gateway URL is accessible
- [ ] Cognito authentication is working
- [ ] User has `custom:tenant_id` attribute in Cognito
- [ ] QuickSight dashboard ID is configured in environment variables

## Common Errors and Solutions

### Error: "Route not found"
- **Cause:** API Gateway deployment not applied
- **Solution:** Follow Step 3 and Step 4 above

### Error: "No authorizer found in request context"
- **Cause:** Missing or invalid JWT token
- **Solution:** Ensure you're sending a valid Cognito ID token in the Authorization header

### Error: "Missing custom:tenant_id claim"
- **Cause:** User doesn't have tenant_id attribute in Cognito
- **Solution:** Update user attributes in Cognito or re-create the user

### Error: "QuickSight configuration error"
- **Cause:** Missing QUICKSIGHT_AWS_ACCOUNT_ID or QUICKSIGHT_DASHBOARD_ID
- **Solution:** Verify environment variables in backend/.env and redeploy Lambda

### Error: "Access denied to QuickSight dashboard"
- **Cause:** Lambda IAM role lacks QuickSight permissions
- **Solution:** Verify IAM role has `quicksight:GenerateEmbedUrlForAnonymousUser` permission

## Environment Variables to Verify

### Backend (.env)
```
QUICKSIGHT_AWS_ACCOUNT_ID=249759897196
QUICKSIGHT_DASHBOARD_ID=bf926a0c-e4dd-48f1-9f83-9e685858cbcb
QUICKSIGHT_EMBED_LAMBDA_ROLE_ARN=arn:aws:iam::249759897196:role/shoppulse-analytics-quicksight-embed-lambda-role-dev
```

### Frontend (.env)
```
VITE_API_GATEWAY_URL=https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev
```

## Testing Locally

If you want to test the Lambda function locally:

```bash
cd backend
npx serverless offline start
```

Then update frontend/.env:
```
VITE_API_GATEWAY_URL=http://localhost:3002/dev
```
