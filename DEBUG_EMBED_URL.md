# Debug Embed URL Error

## Error Message
```json
{"error":"Failed to generate dashboard URL","retryable":true}
```

This is a generic error from the catch block. We need to check the backend logs to see the actual error.

## Debugging Steps

### 1. Check Backend Logs (if running locally)

If you're running `serverless offline`, check the terminal where it's running. You should see console.error logs showing the actual error.

### 2. Check CloudWatch Logs (if using deployed Lambda)

```bash
# Get recent logs
aws logs tail /aws/lambda/dev-shoppulse-quicksight-embed --follow --region us-east-1
```

### 3. Common Issues and Solutions

#### Issue A: Missing Cognito Claims
**Error in logs:** "No authorizer found in request context" or "Missing custom:tenant_id claim"

**Solution:** Check if your user has the required custom attributes:
```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_62mjzjZHF \
  --username YOUR_EMAIL
```

Look for these attributes:
- `custom:tenant_id`
- `custom:role`

If missing, add them:
```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_62mjzjZHF \
  --username YOUR_EMAIL \
  --user-attributes Name=custom:tenant_id,Value=tenant1 Name=custom:role,Value=Finance
```

#### Issue B: User Not in Database
**Error in logs:** "User not found in database"

**Solution:** Add the user to the database:
```sql
-- Connect to your database
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin -d shoppulse

-- Check if user exists
SELECT * FROM users WHERE cognito_user_id = 'YOUR_COGNITO_SUB_ID';

-- If not exists, insert user
INSERT INTO users (tenant_id, cognito_user_id, email, role, region, store_id, status)
VALUES ('tenant1', 'YOUR_COGNITO_SUB_ID', 'your@email.com', 'Finance', 'North', 'store1', 'active');
```

#### Issue C: QuickSight Permissions
**Error in logs:** "AccessDeniedException" or "UnsupportedPricingPlanException"

**Possible causes:**
1. Lambda IAM role doesn't have QuickSight permissions
2. QuickSight is not on Capacity Pricing plan (required for anonymous embedding)
3. Dashboard doesn't exist or ID is wrong

**Check IAM Role:**
```bash
aws iam get-role-policy \
  --role-name shoppulse-analytics-quicksight-embed-lambda-role-dev \
  --policy-name quicksight-embed-policy
```

Should include:
```json
{
  "Effect": "Allow",
  "Action": [
    "quicksight:GenerateEmbedUrlForAnonymousUser"
  ],
  "Resource": "*"
}
```

**Check QuickSight Dashboard:**
```bash
aws quicksight describe-dashboard \
  --aws-account-id 249759897196 \
  --dashboard-id bf926a0c-e4dd-48f1-9f83-9e685858cbcb \
  --region us-east-1
```

#### Issue D: Database Connection
**Error in logs:** Connection timeout or "ECONNREFUSED"

**Solution:** 
- Verify RDS is publicly accessible (for local development)
- Check security group allows your IP
- Verify credentials in backend/.env

```bash
# Test database connection
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin -d shoppulse -c "SELECT 1;"
```

#### Issue E: AWS Credentials (Local Development)
**Error in logs:** "Missing credentials" or "Unable to locate credentials"

**Solution:** Configure AWS credentials:
```bash
aws configure --profile default
# Or set environment variables:
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### 4. Test with Detailed Logging

Add more logging to see exactly where it fails. Check the backend terminal output for:

1. "Received event:" - Shows the incoming request
2. "Routing request:" - Shows HTTP method and path
3. "Event structure:" - Shows authorizer claims
4. "Retrieved user data:" - Shows database query result
5. "Session tags:" - Shows what's being sent to QuickSight
6. "Generating anonymous embed URL" - Shows QuickSight API call

### 5. Quick Test Script

Create a test file to isolate the issue:

```bash
# Test 1: Can you reach the endpoint?
curl -X GET http://localhost:3000/dashboards/embed-url

# Test 2: With authentication (get token from browser DevTools)
curl -X GET http://localhost:3000/dashboards/embed-url \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## Next Steps

1. **Check the backend logs** - This will show the actual error
2. **Share the error message** from the logs
3. Based on the specific error, apply the appropriate solution above

## Most Likely Issues (in order):

1. ✓ Missing or invalid Cognito custom attributes (tenant_id, role)
2. ✓ User not found in database
3. ✓ AWS credentials not configured for local development
4. ✓ Database connection issues
5. ✓ QuickSight IAM permissions
