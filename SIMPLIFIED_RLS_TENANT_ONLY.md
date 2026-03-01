# Simplified RLS - Tenant ID Only

## Overview

Simplified implementation that filters data by `tenant_id` only. Each tenant sees only their own data.

## Architecture

```
User Login (Cognito)
    ↓
JWT with custom:tenant_id = "T001"
    ↓
Backend Lambda
    ↓
Session Tags: [{ Key: "tenant_id", Value: "T001" }]
    ↓
QuickSight Dashboard/Q Agent
    ↓
RLS Filter: WHERE tenant_id = 'T001'
    ↓
User sees only T001 data
```

## What Changed

### Backend (Simplified)

**Before (Multi-level filtering):**
```typescript
// Queried database for region and store_id
const userData = await getUserData(context.tenantId, context.userId);

// Sent 3 tags
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North" },
  { Key: "store_id", Value: "store1" }
]
```

**After (Tenant only):**
```typescript
// No database query needed
// Send only tenant_id from JWT

SessionTags: [
  { Key: "tenant_id", Value: "T001" }
]
```

### Benefits

✅ **Simpler** - No database queries for user data
✅ **Faster** - One less database call per request
✅ **Easier to maintain** - Only one RLS rule
✅ **Still secure** - Tenant isolation maintained

### Trade-offs

❌ **Less granular** - All users in same tenant see same data
❌ **No role-based filtering** - Marketing sees Finance data (if same tenant)
❌ **No regional filtering** - North region sees South region data (if same tenant)

## RLS Configuration

### QuickSight Dataset RLS

**Only one rule needed:**

```
Rule: Tenant Filter
  Column name: tenant_id
  Tag key: tenant_id
  Match type: Equals
```

### Apply via Console

1. QuickSight → Datasets → Your dataset
2. Security & permissions → Row-level security
3. Manage row-level security
4. Tag-based rules
5. Add rule:
   - Column: `tenant_id`
   - Tag key: `tenant_id`
6. Save

### Apply via CLI

```bash
aws quicksight update-data-set \
  --aws-account-id 249759897196 \
  --data-set-id YOUR_DATASET_ID \
  --region us-east-1 \
  --row-level-permission-tag-configuration file://quicksight-rls-config-tenant-only.json
```

## Testing

### Test Scenario

**Tenant T001:**
- User 1 (Marketing) → Sees all T001 data
- User 2 (Finance) → Sees all T001 data
- User 3 (Operations) → Sees all T001 data

**Tenant T002:**
- User 4 (Marketing) → Sees all T002 data
- User 5 (Finance) → Sees all T002 data

**Result:** Tenant isolation works, but no role/region separation within tenant.

### Verify

**Check backend logs:**
```
Session tags (tenant_id): [{"Key":"tenant_id","Value":"T001"}]
```

**Check QuickSight applies filter:**
```sql
-- QuickSight executes:
SELECT * FROM dataset
WHERE tenant_id = 'T001'
```

## When to Use This Approach

**Use tenant-only filtering when:**
- ✅ You have small teams per tenant (everyone should see everything)
- ✅ You want simplicity over granularity
- ✅ Tenant isolation is your main security concern
- ✅ You don't need role-based or regional data separation

**Use multi-level filtering when:**
- ❌ Different roles should see different data (Marketing vs Finance)
- ❌ Regional managers should only see their region
- ❌ Store managers should only see their store
- ❌ You need fine-grained access control

## Code Changes

### Files Modified

1. **backend/src/quicksightEmbed/handler.ts**
   - Removed `getUserData()` database call
   - Simplified `buildSessionTags()` to only return tenant_id
   - Simplified `buildSessionTagsForQ()` to only return tenant_id
   - Updated both `generateEmbedUrl()` and `generateQEmbedUrl()`

2. **quicksight-rls-config-tenant-only.json**
   - New RLS configuration with only tenant_id rule

### Files to Remove (Optional)

Since you're not using region/store filtering, you can optionally remove:
- `database/add-current-user.sql` (if it was only for region/store)
- User data queries in database

## Deployment

### 1. Build Backend

```bash
cd backend
npm run build
```

### 2. Deploy Lambda

```bash
npx serverless deploy --stage dev --region us-east-1
```

### 3. Configure Dataset RLS

```bash
# Get your dataset ID
aws quicksight list-data-sets \
  --aws-account-id 249759897196 \
  --region us-east-1

# Apply RLS configuration
aws quicksight update-data-set \
  --aws-account-id 249759897196 \
  --data-set-id YOUR_DATASET_ID \
  --region us-east-1 \
  --row-level-permission-tag-configuration file://quicksight-rls-config-tenant-only.json
```

### 4. Test

1. Login as user from Tenant T001
2. Open dashboard
3. Should see all T001 data
4. Login as user from Tenant T002
5. Should see all T002 data (different from T001)

## Summary

**What you have now:**
- ✅ Simple tenant-based RLS
- ✅ One session tag: `tenant_id`
- ✅ One RLS rule on dataset
- ✅ No database queries for user data
- ✅ Works for both Dashboard and Q Agent (when enabled)

**What you don't have:**
- ❌ Role-based filtering (Marketing vs Finance)
- ❌ Regional filtering (North vs South)
- ❌ Store-level filtering (store1 vs store2)

This is a clean, simple multi-tenant architecture. Perfect for small teams where everyone in a tenant should see all tenant data.
