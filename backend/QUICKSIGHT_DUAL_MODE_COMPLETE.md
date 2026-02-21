# QuickSight Dual-Mode Embedding Implementation

## Summary
Successfully implemented both anonymous and registered user embedding modes for QuickSight dashboards with a simple environment variable toggle.

## Implementation

### Environment Variable
Set `USE_ANONYMOUS_EMBEDDING` in `.env` file:
- `USE_ANONYMOUS_EMBEDDING=false` - Uses registered user embedding (default, works with per-session pricing)
- `USE_ANONYMOUS_EMBEDDING=true` - Uses anonymous embedding (requires Capacity Pricing plan)

### Code Structure

#### 1. Main Function: `generateEmbedUrl()`
- Retrieves user context from Cognito JWT
- Fetches governance rules from database
- Builds RLS session tags
- Routes to appropriate embedding method based on `USE_ANONYMOUS_EMBEDDING`

#### 2. Anonymous Embedding: `generateAnonymousEmbedUrl()`
- **Pros:**
  - Supports session tags for RLS
  - No need to create QuickSight users
  - Simpler user management
- **Cons:**
  - Requires Capacity Pricing plan
  - More expensive
- **RLS Method:** Session tags passed directly to QuickSight

#### 3. Registered User Embedding: `generateRegisteredUserEmbedUrl()`
- **Pros:**
  - Works with per-session pricing
  - More cost-effective
  - Better for production
- **Cons:**
  - Requires creating QuickSight users
  - Session tags not supported
  - RLS must be configured in dataset
- **RLS Method:** Dataset-level configuration using user attributes

## Features

### Automatic User Management (Registered Mode)
- Creates QuickSight users automatically on first access
- Username format: `{role-name}/cognito-{email}`
- Automatically grants dashboard permissions to new users
- Handles existing users gracefully

### RLS (Row-Level Security)
- **tenant_id**: Extracted from Cognito custom claim
- **role**: User's role from Cognito
- **governance_rules**: Retrieved from PostgreSQL database

### Session Context Passing

#### Anonymous Embedding (Session Tags)
Session tags are passed directly in the API call:
```javascript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "role", Value: "Finance" },
  { Key: "region", Value: "North,South" },  // from governance rules
  { Key: "store_id", Value: "S001,S002" }   // from governance rules
]
```
Use in dataset: `${tag:tenant_id}`, `${tag:role}`

#### Registered User Embedding (URL Parameters)
Session parameters are appended to the embed URL:
```
?p.tenant_id=T001&p.role=Finance&p.region=North,South
```
Use in dashboard: Create parameters and reference as `${tenant_id}`, `${role}`

## Configuration

### Backend (.env)
```bash
QUICKSIGHT_AWS_ACCOUNT_ID=249759897196
QUICKSIGHT_DASHBOARD_ID=bf926a0c-e4dd-48f1-9f83-9e685858cbcb
USE_ANONYMOUS_EMBEDDING=false
QUICKSIGHT_EMBED_LAMBDA_ROLE_ARN=arn:aws:iam::249759897196:role/shoppulse-analytics-quicksight-embed-lambda-role-dev
```

### IAM Permissions
The Lambda role has permissions for:
- `quicksight:GenerateEmbedUrlForRegisteredUser`
- `quicksight:GenerateEmbedUrlForAnonymousUser`
- `quicksight:RegisterUser`
- `quicksight:DescribeUser`
- `quicksight:UpdateDashboardPermissions`
- `quicksight:DescribeDashboardPermissions`

## Testing

### Test Registered User Embedding (Current Setup)
1. Set `USE_ANONYMOUS_EMBEDDING=false` in `.env`
2. Deploy: `npm run build && serverless deploy function -f quicksightEmbed --force`
3. Access dashboard from frontend
4. Check CloudWatch logs for: "Using REGISTERED embedding"

### Test Anonymous Embedding (Requires Capacity Pricing)
1. Set `USE_ANONYMOUS_EMBEDDING=true` in `.env`
2. Deploy: `npm run build && serverless deploy function -f quicksightEmbed --force`
3. Access dashboard from frontend
4. Check CloudWatch logs for: "Using ANONYMOUS embedding"
5. If you get "UnsupportedPricingPlanException", your account doesn't have Capacity Pricing

## Deployment

```bash
# Build TypeScript
npm run build

# Deploy QuickSight Lambda
serverless deploy function -f quicksightEmbed --force

# Or deploy everything
npm run deploy
```

## Troubleshooting

### "UnsupportedPricingPlanException"
- Your QuickSight account doesn't have Capacity Pricing
- Solution: Set `USE_ANONYMOUS_EMBEDDING=false`

### "Dashboard not accessible"
- User doesn't have permissions
- Solution: Dashboard permissions are automatically granted on user creation
- Check CloudWatch logs for permission grant success/failure

### "refused to connect" in iframe
- Frontend domain not whitelisted in QuickSight
- Solution: Add domain in QuickSight Console → Manage QuickSight → Domains and embedding

## RLS Configuration

### For Anonymous Embedding
- RLS is handled via session tags automatically
- Configure in dataset Row-level security:
  ```
  ${tag:tenant_id} = tenant_id_column
  ${tag:role} = role_column
  ```
- No additional configuration needed in dashboard

### For Registered User Embedding
You need to configure parameters in the QuickSight dashboard:

1. Open the dashboard in QuickSight
2. Click "Parameters" in the left panel
3. Create parameters:
   - Name: `tenant_id`, Type: String
   - Name: `role`, Type: String
   - Name: `region`, Type: String (if using governance rules)
   - Name: `store_id`, Type: String (if using governance rules)

4. In your dataset, create filters using parameters:
   ```
   tenant_id_column = ${tenant_id}
   role_column = ${role}
   ```

5. Apply filters to visuals

**Note**: Parameters are passed as URL query parameters (`?p.tenant_id=T001&p.role=Finance`)

## Current Status
- ✅ Both embedding modes implemented
- ✅ Automatic user creation and permission management
- ✅ tenant_id extraction from Cognito JWT
- ✅ Governance rules integration
- ✅ Session tags for anonymous embedding
- ✅ Session parameters (URL query params) for registered embedding
- ✅ Error handling for both modes
- ⚠️ Frontend domain needs to be whitelisted in QuickSight Console
- ⚠️ Dashboard parameters need to be configured in QuickSight (for registered mode)

## Next Steps
1. Whitelist frontend domain in QuickSight Console
2. Configure dashboard parameters in QuickSight (for registered mode):
   - Create `tenant_id` parameter
   - Create `role` parameter
   - Create governance rule parameters (region, store_id, etc.)
   - Apply parameter filters to visuals
3. Test with multiple tenants and roles
4. Monitor CloudWatch logs for parameter values
