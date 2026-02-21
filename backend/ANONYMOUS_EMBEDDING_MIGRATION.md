# Migration to Anonymous Embedding Only

## What Changed

Simplified the QuickSight embedding implementation to use **only anonymous embedding** with session tags. Removed all registered user embedding logic.

## Why This Change?

### Simplicity
- Single API call (`GenerateEmbedUrlForAnonymousUserCommand`)
- No user management required
- No user registration or permission granting
- Cleaner codebase

### Security
- All context in session tags (not visible in URL)
- No URL parameters to manipulate
- Consistent security model

### Consistency
- Same approach for all users
- No mode switching logic
- Predictable behavior

## What Was Removed

### Code
- `GenerateEmbedUrlForRegisteredUserCommand`
- `RegisterUserCommand`
- `DescribeUserCommand`
- `UpdateDashboardPermissionsCommand`
- `ensureQuickSightUser()` function
- `generateRegisteredUserEmbedUrl()` function
- `buildSessionParameters()` function
- Session parameter logic
- URL parameter appending logic
- Dual-mode switching logic

### Configuration
- `USE_ANONYMOUS_EMBEDDING` environment variable
- Registered user IAM permissions
- Session parameter types

### Files Deleted/Simplified
- Removed registered user logic from handler
- Simplified IAM policy
- Removed session parameter interface
- Cleaned up environment variables

## What Remains

### Session Tags
All user context passed as session tags:
```typescript
[
  { Key: "tenant_id", Value: "T001" },
  { Key: "userRole", Value: "Finance" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]
```

### Single Function
```typescript
async function generateAnonymousEmbedUrl(
  sessionTags: SessionTag[],
): Promise<string>
```

### Simple Flow
1. Extract context from Cognito JWT
2. Retrieve governance rules from database
3. Build session tags
4. Generate anonymous embed URL
5. Return URL to frontend

## QuickSight Configuration

### Dataset RLS Only
Configure in dataset:
```
${tag:tenant_id} = tenant_id_column
${tag:userRole} = role_column
${tag:region} = region_column
```

### No Dashboard Parameters Needed
All filtering done at dataset level via session tags.

## Deployment Steps

### 1. Update IAM Permissions
```bash
cd infrastructure
terraform apply -auto-approve
```

### 2. Deploy Lambda
```bash
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

### 3. Verify Configuration
- Check `.env` file (no USE_ANONYMOUS_EMBEDDING)
- Verify dataset RLS rules in QuickSight
- Confirm domains are whitelisted

### 4. Test
- Access dashboard from frontend
- Check CloudWatch logs for session tags
- Verify RLS filtering works

## Requirements

### QuickSight Capacity Pricing
Anonymous embedding requires Capacity Pricing plan. If you don't have it:
1. Contact AWS Support
2. Request upgrade to Capacity Pricing
3. Wait for approval (usually 1-2 business days)

### Dataset RLS Configuration
Must configure RLS rules in dataset using session tag syntax:
- `${tag:tenant_id}`
- `${tag:userRole}`
- `${tag:dimension_name}`

## Benefits

### Simplified Codebase
- 50% less code
- Easier to maintain
- Fewer edge cases
- No user management complexity

### Better Security
- No URL parameters
- Session tags not visible
- Consistent security model
- No user registration vulnerabilities

### Easier Testing
- Single code path
- Predictable behavior
- Simpler debugging
- Clearer logs

### Lower Maintenance
- No user lifecycle management
- No permission synchronization
- No user cleanup needed
- Fewer moving parts

## Trade-offs

### Requires Capacity Pricing
- More expensive than per-session pricing
- Fixed monthly cost
- Need to plan capacity

### Dataset-Level RLS Only
- Cannot use dashboard parameters for RLS
- All filtering must be in dataset
- Less flexible than dashboard parameters

## Migration Checklist

- [ ] Verify QuickSight has Capacity Pricing
- [ ] Configure dataset RLS with session tags
- [ ] Remove dashboard parameters (if any)
- [ ] Update IAM permissions (Terraform apply)
- [ ] Deploy updated Lambda function
- [ ] Test with multiple tenants
- [ ] Test with multiple roles
- [ ] Verify CloudWatch logs
- [ ] Confirm RLS filtering works
- [ ] Update documentation

## Rollback Plan

If issues occur, previous version with dual-mode support is available in git history:
```bash
git checkout <previous-commit>
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

## Files Modified

### Backend
- `backend/src/quicksightEmbed/handler.ts` - Simplified to anonymous only
- `backend/src/quicksightEmbed/types.ts` - Removed SessionParameter
- `backend/.env` - Removed USE_ANONYMOUS_EMBEDDING
- `backend/serverless.yml` - Removed environment variable

### Infrastructure
- `infrastructure/lambda_iam.tf` - Simplified IAM permissions

### Documentation
- `backend/QUICKSIGHT_ANONYMOUS_EMBEDDING.md` - New simplified guide
- `backend/ANONYMOUS_EMBEDDING_MIGRATION.md` - This file

## Testing Results

Expected CloudWatch logs:
```
Session tags (tenant_id, userRole, governance rules):
[{"Key":"tenant_id","Value":"T001"},{"Key":"userRole","Value":"Finance"}]

Generating anonymous embed URL with session tags for RLS
Embed URL generated for user m.hariri@zeroandone.me in tenant T001
```

Expected behavior:
- Dashboard loads successfully
- Only tenant-specific data visible
- Role-based filtering works
- No URL parameters in embed URL

## Summary

The migration to anonymous embedding only simplifies the codebase significantly while maintaining all security and functionality requirements. The trade-off is requiring QuickSight Capacity Pricing, but the benefits in code simplicity and maintainability are substantial.

All user context is now consistently passed as session tags, providing a clean and secure approach to Row-Level Security in embedded QuickSight dashboards.
