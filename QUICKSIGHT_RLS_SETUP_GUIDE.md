# QuickSight RLS Setup Guide

## Prerequisites

1. QuickSight dataset created
2. Dataset has columns: `tenant_id`, `region`, `store_id`
3. Dashboard using this dataset
4. Backend sending session tags

## Step-by-Step Setup

### Step 1: Find Your Dataset ID

```bash
# List all datasets
aws quicksight list-data-sets \
  --aws-account-id 249759897196 \
  --region us-east-1

# Note the DataSetId for your dataset
```

### Step 2: Configure RLS via Console

**Option A: AWS Console (Recommended for first time)**

1. Go to QuickSight Console
2. Click "Datasets" → Select your dataset
3. Click "Security & permissions" tab
4. Scroll to "Row-level security"
5. Click "Manage row-level security"
6. Select "Tag-based rules"
7. Add three rules:

   **Rule 1:**
   - Column: `tenant_id`
   - Tag key: `tenant_id`
   - Match type: Equals

   **Rule 2:**
   - Column: `region`
   - Tag key: `region`
   - Match type: Equals

   **Rule 3:**
   - Column: `store_id`
   - Tag key: `store_id`
   - Match type: Equals

8. Click "Apply"

**Option B: AWS CLI**

```bash
# Create RLS config file (already created: quicksight-rls-config.json)

# Apply to dataset
aws quicksight update-data-set \
  --aws-account-id 249759897196 \
  --data-set-id YOUR_DATASET_ID \
  --region us-east-1 \
  --cli-input-json file://quicksight-rls-config.json
```

### Step 3: Verify Configuration

```bash
# Check RLS is enabled
aws quicksight describe-data-set \
  --aws-account-id 249759897196 \
  --data-set-id YOUR_DATASET_ID \
  --region us-east-1 \
  --query 'DataSet.RowLevelPermissionTagConfiguration'
```

**Expected output:**
```json
{
  "Status": "ENABLED",
  "TagRules": [
    {
      "TagKey": "tenant_id",
      "ColumnName": "tenant_id",
      "MatchAllValue": "*"
    },
    {
      "TagKey": "region",
      "ColumnName": "region",
      "MatchAllValue": "*"
    },
    {
      "TagKey": "store_id",
      "ColumnName": "store_id",
      "MatchAllValue": "*"
    }
  ]
}
```

### Step 4: Test RLS

**Test User 1 (Marketing, North, store1):**
1. Login to your app as Marketing user
2. Open dashboard
3. Check backend logs for session tags:
   ```
   Session tags: [
     {"Key":"tenant_id","Value":"T001"},
     {"Key":"region","Value":"North"},
     {"Key":"store_id","Value":"store1"}
   ]
   ```
4. Verify dashboard shows only North/store1 data

**Test User 2 (Finance, South, store2):**
1. Login as Finance user
2. Open dashboard
3. Should see different data (South/store2)

### Step 5: Troubleshooting

**Issue: RLS not filtering data**

Check:
1. Dataset has the columns: `tenant_id`, `region`, `store_id`
2. Column names match exactly (case-sensitive)
3. Session tags are being sent (check backend logs)
4. RLS status is "ENABLED"

**Issue: "Access Denied" error**

Check:
1. Lambda IAM role has `quicksight:GenerateEmbedUrlForAnonymousUser`
2. Dashboard permissions allow anonymous embedding
3. Session tags format is correct

**Issue: All users see same data**

Check:
1. Session tags are different per user (check logs)
2. RLS rules are applied to correct columns
3. Dataset refresh completed after RLS configuration

## RLS Configuration Options

### Match All Value

```json
"MatchAllValue": "*"
```

If session tag value is `*`, user sees all data (useful for Admin role).

**Example:**
```typescript
// Admin user gets all data
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "*" },      // See all regions
  { Key: "store_id", Value: "*" }     // See all stores
]
```

### Multi-Value Delimiter

```json
"TagMultiValueDelimiter": ","
```

If user should see multiple values:

```typescript
// User sees North AND South regions
SessionTags: [
  { Key: "region", Value: "North,South" }
]
```

QuickSight applies: `WHERE region IN ('North', 'South')`

## Dataset Schema Requirements

Your dataset MUST have these columns for RLS to work:

```sql
-- Required columns in your dataset
SELECT 
  tenant_id,      -- VARCHAR, matches session tag
  region,         -- VARCHAR, matches session tag
  store_id,       -- VARCHAR, matches session tag
  -- ... other columns
FROM your_table
```

**If columns are missing:**
1. Add them to your source data (database)
2. Refresh the dataset in QuickSight
3. Verify columns appear in dataset schema

## Backend Session Tags

Your backend is already sending session tags correctly:

```typescript
// backend/src/quicksightEmbed/handler.ts
const sessionTags = buildSessionTags(
  context.tenantId,    // From Cognito custom:tenant_id
  userData.region,     // From database users table
  userData.store_id,   // From database users table
);

// Returns:
[
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North" },
  { Key: "store_id", Value: "store1" }
]
```

This matches the RLS configuration, so it should work!

## Next Steps

1. ✅ Configure RLS on dataset (follow Step 2 above)
2. ✅ Verify configuration (Step 3)
3. ✅ Test with different users (Step 4)
4. ✅ Check that each user sees only their data

## Reference

- AWS Docs: https://docs.aws.amazon.com/quicksight/latest/user/row-level-security-tags.html
- Your backend code: `backend/src/quicksightEmbed/handler.ts`
- RLS config file: `quicksight-rls-config.json`
