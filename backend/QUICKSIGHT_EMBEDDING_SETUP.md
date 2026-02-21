# QuickSight Embedding Setup

## Issue
The QuickSight dashboard is refusing to connect in the iframe with the error:
```
us-east-1.quicksight.aws.amazon.com refused to connect
```

## Root Cause
QuickSight Enterprise edition requires domain whitelisting for embedding. Your frontend domain needs to be added to the allowed domains list.

## Solution

### Step 1: Add Allowed Domains in QuickSight Console

1. Go to the AWS QuickSight Console: https://us-east-1.quicksight.aws.amazon.com/
2. Click on your username in the top right corner
3. Select "Manage QuickSight"
4. In the left menu, click on "Domains and Embedding"
5. Under "Approved domains for embedding", click "Manage domains"
6. Add the following domains:
   - `http://localhost:5173` (for local development)
   - `http://localhost:3000` (alternative local port)
   - `https://your-production-domain.com` (for production)
7. Click "Add domains"

### Step 2: Verify Dashboard Permissions

The dashboard needs to be accessible by the IAM role users. Run this command to verify:

```bash
aws quicksight describe-dashboard-permissions \
  --aws-account-id 249759897196 \
  --dashboard-id bf926a0c-e4dd-48f1-9f83-9e685858cbcb \
  --region us-east-1
```

### Step 3: Test the Embedding

After adding the domains:
1. Clear your browser cache
2. Reload the frontend application
3. Navigate to the dashboard page
4. The QuickSight dashboard should now load in the iframe

## Alternative: Use QuickSight API

You can also add domains programmatically using the AWS CLI (requires QuickSight admin permissions):

```bash
# Note: This command may not be available in all AWS CLI versions
aws quicksight update-account-customization \
  --aws-account-id 249759897196 \
  --namespace default \
  --account-customization DefaultTheme=MIDNIGHT \
  --region us-east-1
```

## Troubleshooting

### If the dashboard still doesn't load:

1. **Check browser console for errors**
   - Look for CORS or CSP errors
   - Check if the embed URL is valid

2. **Verify the embed URL format**
   - Should start with `https://us-east-1.quicksight.aws.amazon.com/embed/`
   - Should include authentication token

3. **Check QuickSight user permissions**
   - The IAM role user needs READER access to the dashboard
   - Verify with: `aws quicksight list-users --aws-account-id 249759897196 --namespace default --region us-east-1`

4. **Test the embed URL directly**
   - Copy the embed URL from the API response
   - Open it in a new browser tab
   - If it works there but not in iframe, it's a domain whitelisting issue

## Current Configuration

- **QuickSight Account**: 249759897196
- **Dashboard ID**: bf926a0c-e4dd-48f1-9f83-9e685858cbcb
- **Dashboard Name**: ShopPulse Main Dashboard
- **Region**: us-east-1
- **Lambda Role**: shoppulse-analytics-quicksight-embed-lambda-role-dev

## Next Steps

1. Add your frontend domain to QuickSight allowed domains (Step 1 above)
2. Test the dashboard embedding
3. If issues persist, check the browser console and CloudWatch logs for more details
