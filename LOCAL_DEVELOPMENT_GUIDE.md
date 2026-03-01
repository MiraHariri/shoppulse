# Local Development Guide

## Running Backend and Frontend Locally

### Prerequisites

- Node.js installed
- AWS credentials configured (for QuickSight API calls)
- Database accessible (RDS with public access or local PostgreSQL)

## Step-by-Step

### 1. Start Backend (Serverless Offline)

**Terminal 1:**
```bash
cd backend

# Make sure dependencies are installed
npm install

# Build TypeScript
npm run build

# Start serverless offline
npx serverless offline start
```

**Output:**
```
Serverless: Starting Offline at stage dev (us-east-1)

Serverless: Routes for userManagement:
POST http://localhost:3000/dev/users
GET http://localhost:3000/dev/users
...

Serverless: Routes for quicksightEmbed:
GET http://localhost:3000/dev/dashboards/embed-url
GET http://localhost:3000/dev/dashboards/q-embed-url

Serverless: Offline [http for lambda] listening on http://localhost:3002
Serverless: Offline [http] listening on http://localhost:3000
```

**Backend is now running on:**
- HTTP API: `http://localhost:3000`
- Lambda: `http://localhost:3002` (internal)

### 2. Configure Frontend for Local Backend

**Edit `frontend/.env`:**
```env
# Use local backend
VITE_API_GATEWAY_URL=http://localhost:3000

# Keep Cognito settings (uses real AWS Cognito)
VITE_COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF
VITE_COGNITO_CLIENT_ID=fnm7uhg94irur76kgj3gl0ofs
VITE_AWS_REGION=us-east-1
```

### 3. Start Frontend

**Terminal 2:**
```bash
cd frontend

# Make sure dependencies are installed
npm install

# Start dev server
npm run dev
```

**Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Frontend is now running on:**
- `http://localhost:5173`

### 4. Test the Setup

1. Open browser: `http://localhost:5173`
2. Login with your Cognito credentials
3. Navigate to Dashboard
4. Backend logs will show in Terminal 1

**Backend logs you'll see:**
```
Received event: {...}
Routing request: GET /dashboards/embed-url
Event structure: {...}
Session tags (tenant_id): [{"Key":"tenant_id","Value":"T001"}]
Generating anonymous embed URL with session tags for RLS
Embed URL generated for user user@example.com in tenant T001
```

## What Runs Locally vs AWS

### Runs Locally ✅
- Backend Lambda functions (via serverless-offline)
- Frontend React app (via Vite)
- API routing and request handling

### Runs on AWS ☁️
- Cognito authentication (real AWS)
- RDS database (real AWS)
- QuickSight API calls (real AWS)
- QuickSight dashboard rendering (real AWS)

**This is a hybrid setup** - your code runs locally but connects to real AWS services.

## Environment Variables

### Backend (.env)
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Cognito
COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF

# Database (must be accessible)
RDS_HOST=shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=shoppulse
RDS_USERNAME=shoppulse_admin
RDS_PASSWORD=AkWoH4mTtfXOT899CtdsSjpErE02qkqQ

# QuickSight
QUICKSIGHT_AWS_ACCOUNT_ID=249759897196
QUICKSIGHT_DASHBOARD_ID=bf926a0c-e4dd-48f1-9f83-9e685858cbcb
QUICKSIGHT_Q_TOPIC_ID=your-topic-id-here

# IAM Roles (not used locally, but required by serverless.yml)
USER_MANAGEMENT_LAMBDA_ROLE_ARN=arn:aws:iam::249759897196:role/...
QUICKSIGHT_EMBED_LAMBDA_ROLE_ARN=arn:aws:iam::249759897196:role/...
```

### Frontend (.env)
```env
# Local backend
VITE_API_GATEWAY_URL=http://localhost:3000

# AWS Cognito (real)
VITE_COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF
VITE_COGNITO_CLIENT_ID=fnm7uhg94irur76kgj3gl0ofs
VITE_AWS_REGION=us-east-1
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Check:**
1. RDS security group allows your IP
2. RDS is publicly accessible
3. Credentials are correct

**Test connection:**
```bash
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin -d shoppulse
```

### Issue: "AWS credentials not found"

**Solution:**
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### Issue: "QuickSight Access Denied"

**Check:**
1. Your AWS credentials have QuickSight permissions
2. QuickSight dashboard exists
3. Dashboard ID is correct

### Issue: "CORS error"

**This shouldn't happen with serverless-offline** as it's configured in `serverless.yml`:
```yaml
httpApi:
  cors:
    allowedOrigins:
      - '*'
```

If you still see CORS errors, restart serverless-offline.

### Issue: Frontend can't reach backend

**Check:**
1. Backend is running on `http://localhost:3000`
2. Frontend `.env` has `VITE_API_GATEWAY_URL=http://localhost:3000`
3. Restart frontend after changing `.env`

## Hot Reloading

### Backend
**Serverless-offline does NOT auto-reload on code changes.**

After changing backend code:
```bash
# Stop serverless-offline (Ctrl+C)
npm run build
npx serverless offline start
```

### Frontend
**Vite auto-reloads on code changes** ✅

Just save your files and the browser will refresh automatically.

## Switching Between Local and Production

### Use Local Backend
```env
# frontend/.env
VITE_API_GATEWAY_URL=http://localhost:3000
```

### Use Production Backend
```env
# frontend/.env
VITE_API_GATEWAY_URL=https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev
```

**Restart frontend after changing `.env`**

## Testing API Endpoints Directly

### Test with curl

```bash
# Get embed URL (need valid JWT token)
curl -X GET http://localhost:3000/dashboards/embed-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test without auth (will fail, but shows endpoint is reachable)
curl -X GET http://localhost:3000/dashboards/embed-url
```

### Get JWT Token

**From browser console (after login):**
```javascript
const session = await window.Amplify.Auth.fetchAuthSession();
console.log(session.tokens.idToken.toString());
```

Copy the token and use in curl.

## Benefits of Local Development

✅ **Fast iteration** - No deployment wait time
✅ **Easy debugging** - See logs in real-time
✅ **Cost savings** - No Lambda invocation charges
✅ **Offline work** - Work without internet (except AWS services)

## Limitations

❌ **Not 100% identical to Lambda** - Some Lambda-specific features may differ
❌ **Still needs AWS services** - Cognito, RDS, QuickSight must be accessible
❌ **No auto-reload** - Must rebuild and restart after backend changes

## Production Deployment

When ready to deploy:

```bash
# Build backend
cd backend
npm run build

# Deploy to AWS
npx serverless deploy --stage dev --region us-east-1

# Update frontend .env to use production URL
# frontend/.env
VITE_API_GATEWAY_URL=https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev

# Build and deploy frontend (if using S3/CloudFront)
cd frontend
npm run build
```

## Quick Commands Reference

```bash
# Start backend locally
cd backend && npx serverless offline start

# Start frontend locally
cd frontend && npm run dev

# Build backend
cd backend && npm run build

# Deploy backend to AWS
cd backend && npx serverless deploy

# Build frontend for production
cd frontend && npm run build
```
