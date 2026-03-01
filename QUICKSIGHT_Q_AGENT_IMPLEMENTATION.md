# QuickSight Q Agent Implementation

## Overview

Successfully implemented QuickSight Q (Generative AI agent) embedding with RLS (Row-Level Security) based on user's tenant, department/role, region, and store.

## Architecture

```
Cognito User Pool
├── custom:tenant_id = "T001"
├── custom:role = "Marketing" (department)
│
User logs in → gets JWT
▼
Backend Lambda
├── Reads JWT: tenant_id=T001, role=Marketing
├── Queries database for user's region & store_id
├── Calls GenerateEmbedUrlForAnonymousUser(
│   SessionTags: [
│     { tenant_id: "T001" },
│     { department: "Marketing" },
│     { region: "North" },
│     { store_id: "store1" }
│   ]
│ )
└── Returns embed_url to frontend
│
▼
Frontend
├── Renders iframe with embed_url
└── Q agent answers questions based on RLS-filtered data
│
▼
QuickSight Q (1 Namespace, 1 Topic, 1 Dataset)
├── RLS filters dataset to ONLY Marketing rows for T001
└── Agent answers based on only what that user can see
```

## What Was Implemented

### Backend Changes

1. **Handler Updates** (`backend/src/quicksightEmbed/handler.ts`)
   - Added `QUICKSIGHT_Q_TOPIC_ID` environment variable
   - Created `buildSessionTagsForQ()` function with department tag
   - Created `generateQEmbedUrl()` handler for Q agent
   - Created `generateAnonymousQEmbedUrl()` for Q-specific embedding

2. **Router Updates** (`backend/src/quicksightEmbed/index.ts`)
   - Added route: `GET /dashboards/q-embed-url`
   - Exports `generateQEmbedUrl` function

3. **Configuration** (`backend/serverless.yml`)
   - Added `QUICKSIGHT_Q_TOPIC_ID` environment variable
   - Included in dotenv plugin configuration

4. **Environment Files**
   - Added `QUICKSIGHT_Q_TOPIC_ID` to `.env` and `.env.example`

### Frontend Changes

1. **Services** (`frontend/src/services/qAgentService.ts`)
   - Created service to fetch Q agent embed URL

2. **Redux Store** (`frontend/src/store/qAgentSlice.ts`)
   - Created Q agent slice with loading/error states
   - Async thunk for fetching embed URL

3. **Store Configuration** (`frontend/src/store/index.ts`)
   - Added `qAgent` reducer to store

4. **Custom Hook** (`frontend/src/hooks/useQAgent.ts`)
   - Created `useQAgent()` hook for Q agent management

5. **Components** (`frontend/src/components/qagent/`)
   - `QAgentEmbed.tsx` - Main Q agent embed component
   - `QAgentEmbed.css` - Styling for Q agent interface
   - Features:
     - Auto-refresh before URL expiration
     - Loading and error states
     - QuickSight Embedding SDK integration
     - Event handling

6. **Pages** (`frontend/src/pages/QAgentPage.tsx`)
   - Created dedicated page for Q agent

7. **Navigation**
   - Updated `App.tsx` with `/q-agent` route
   - Updated `Sidebar.tsx` with Q Agent menu item
   - Added QuestionAnswer icon

8. **Constants** (`frontend/src/utils/constants.ts`)
   - Added `Q_AGENT_EMBED` endpoint

## Session Tags for RLS

The Q agent receives these session tags for filtering:

```typescript
[
  { Key: "tenant_id", Value: "T001" },        // From Cognito custom:tenant_id
  { Key: "department", Value: "Marketing" },  // From Cognito custom:role
  { Key: "region", Value: "North" },          // From database users table
  { Key: "store_id", Value: "store1" }        // From database users table
]
```

## QuickSight Q Setup Required

### 1. Create Q Topic

In QuickSight console:
1. Go to Topics
2. Create new topic
3. Select your dataset (with RLS configured)
4. Configure RLS rules to use session tags:
   - `tenant_id = ${tenant_id}`
   - `department = ${department}` (or role field)
   - `region = ${region}`
   - `store_id = ${store_id}`

### 2. Get Topic ID

```bash
aws quicksight list-topics \
  --aws-account-id 249759897196 \
  --region us-east-1
```

Copy the Topic ID and add to `backend/.env`:
```
QUICKSIGHT_Q_TOPIC_ID=your-topic-id-here
```

### 3. Update IAM Role

Ensure the Lambda role has permission:
```json
{
  "Effect": "Allow",
  "Action": [
    "quicksight:GenerateEmbedUrlForAnonymousUser"
  ],
  "Resource": [
    "arn:aws:quicksight:us-east-1:249759897196:topic/*"
  ]
}
```

### 4. Configure Dataset RLS

In your QuickSight dataset:
1. Go to Security & permissions
2. Add RLS rules using session tags:
   ```
   tenant_id = ${tenant_id}
   department = ${department}
   region = ${region}
   store_id = ${store_id}
   ```

## Deployment Steps

### 1. Update Environment Variables

```bash
# backend/.env
QUICKSIGHT_Q_TOPIC_ID=your-actual-topic-id
```

### 2. Build and Deploy Backend

```bash
cd backend
npm run build
npx serverless deploy --stage dev --region us-east-1
```

### 3. Test the Endpoint

```bash
curl -X GET \
  https://9g0b03kd0l.execute-api.us-east-1.amazonaws.com/dev/dashboards/q-embed-url \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Navigate to `/q-agent` in the app.

## How It Works

1. **User Authentication**
   - User logs in via Cognito
   - JWT contains: `custom:tenant_id`, `custom:role`, `sub`, `email`

2. **Backend Processing**
   - Lambda extracts claims from JWT
   - Queries database for user's region and store_id
   - Builds session tags with all 4 dimensions
   - Calls QuickSight API to generate embed URL

3. **Frontend Rendering**
   - Fetches embed URL from backend
   - Loads QuickSight Embedding SDK
   - Embeds Q agent in iframe
   - Auto-refreshes URL before expiration

4. **Q Agent Filtering**
   - QuickSight applies RLS based on session tags
   - User only sees data for their tenant, department, region, store
   - Q agent answers questions using filtered data only

## Testing

### Test Different Roles

Create users with different roles to test RLS:

```sql
-- Marketing user
INSERT INTO users (user_id, tenant_id, email, cognito_user_id, role, region, store_id, status)
VALUES ('U002', 'T001', 'marketing@example.com', 'COGNITO_SUB', 'Marketing', 'North', 'store1', 'Active');

-- Finance user
INSERT INTO users (user_id, tenant_id, email, cognito_user_id, role, region, store_id, status)
VALUES ('U003', 'T001', 'finance@example.com', 'COGNITO_SUB', 'Finance', 'South', 'store2', 'Active');
```

Update Cognito attributes:
```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_62mjzjZHF \
  --username marketing@example.com \
  --user-attributes Name=custom:tenant_id,Value=T001 Name=custom:role,Value=Marketing
```

### Verify RLS

1. Login as Marketing user
2. Go to Q Agent page
3. Ask: "Show me all sales data"
4. Should only see Marketing department data for T001, North region, store1

5. Login as Finance user
6. Ask same question
7. Should only see Finance department data for T001, South region, store2

## Benefits

1. **Single Agent, Multiple Users** - One Q topic serves all users with automatic filtering
2. **Secure** - RLS enforced at QuickSight level, not application level
3. **Scalable** - No need to create separate agents per tenant/role
4. **Natural Language** - Users ask questions in plain English
5. **Context-Aware** - Agent only knows about data user is allowed to see

## Next Steps

1. Configure your QuickSight Q topic with RLS
2. Add the topic ID to environment variables
3. Deploy the backend
4. Test with different user roles
5. Customize Q agent prompts and suggestions in QuickSight console

## Files Changed

### Backend
- `backend/src/quicksightEmbed/handler.ts` - Added Q agent handler
- `backend/src/quicksightEmbed/index.ts` - Added Q route
- `backend/serverless.yml` - Added Q topic env var
- `backend/.env` - Added Q topic ID
- `backend/.env.example` - Added Q topic ID

### Frontend
- `frontend/src/services/qAgentService.ts` - New service
- `frontend/src/store/qAgentSlice.ts` - New Redux slice
- `frontend/src/store/index.ts` - Added reducer
- `frontend/src/hooks/useQAgent.ts` - New hook
- `frontend/src/components/qagent/QAgentEmbed.tsx` - New component
- `frontend/src/components/qagent/QAgentEmbed.css` - New styles
- `frontend/src/pages/QAgentPage.tsx` - New page
- `frontend/src/App.tsx` - Added route
- `frontend/src/components/layout/Sidebar.tsx` - Added menu item
- `frontend/src/utils/constants.ts` - Added endpoint

## API Endpoint

```
GET /dashboards/q-embed-url
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "embedUrl": "https://...",
  "expiresIn": 900
}
```
