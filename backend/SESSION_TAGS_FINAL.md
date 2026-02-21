# QuickSight Session Tags - Final Implementation

## Overview
The QuickSight embedding now uses a hybrid approach with session tags for security-critical data and URL parameters for flexible user context.

## Session Tags (Secure)

### Always Included
1. **tenant_id** - Tenant identifier for multi-tenancy
2. **store_id** - Store identifier (from governance rules or empty)
3. **region** - Region identifier (from governance rules or empty)
4. **Additional governance rules** - Any other dimensions from database

### Example
```typescript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "store_id", Value: "S001,S002,S003" },
  { Key: "region", Value: "North,South" },
  { Key: "department", Value: "Electronics,Clothing" }  // if exists in DB
]
```

## URL Parameters (Flexible)

### userRole Parameter
- Passed as: `?p.userRole=Finance`
- Visible in URL for debugging
- Used in dashboard parameters

### Example Embed URL
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...&p.userRole=Finance
```

## Implementation Details

### Session Tag Logic
```typescript
function buildSessionTags(
  tenantId: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
  ];

  // Add all governance rules from database
  for (const rule of governanceRules) {
    sessionTags.push({
      Key: rule.dimension,
      Value: rule.values.join(","),
    });
  }

  // Ensure store_id and region are always present
  const hasStoreId = governanceRules.some(rule => rule.dimension === "store_id");
  const hasRegion = governanceRules.some(rule => rule.dimension === "region");

  if (!hasStoreId) {
    sessionTags.push({ Key: "store_id", Value: "" });
  }

  if (!hasRegion) {
    sessionTags.push({ Key: "region", Value: "" });
  }

  return sessionTags;
}
```

### Key Features
1. **Always includes tenant_id** - Core security boundary
2. **Always includes store_id and region** - Even if empty (for consistent RLS rules)
3. **Adds all governance rules from database** - Flexible governance model
4. **Appends userRole as URL parameter** - Dashboard-level filtering

## CloudWatch Logs Output

### Example Log
```
Retrieved 2 governance rules for user abc-123-def

Session tags (tenant_id, store_id, region, governance rules):
[
  {"Key":"tenant_id","Value":"T001"},
  {"Key":"store_id","Value":"S001,S002"},
  {"Key":"region","Value":"North,South"}
]

Generating anonymous embed URL with session tags for RLS
userRole will be passed as URL parameter: Finance
Embed URL generated with userRole parameter
Embed URL generated for user m.hariri@zeroandone.me in tenant T001
```

### If No Governance Rules
```
Retrieved 0 governance rules for user abc-123-def

Session tags (tenant_id, store_id, region, governance rules):
[
  {"Key":"tenant_id","Value":"T001"},
  {"Key":"store_id","Value":""},
  {"Key":"region","Value":""}
]
```

## QuickSight Configuration

### 1. Dataset RLS (Session Tags)
Configure in dataset:
```
${tag:tenant_id} = tenant_id_column
${tag:store_id} = store_id_column
${tag:region} = region_column
```

**Important**: Even if store_id or region are empty strings, the RLS rules should handle this:
```sql
-- Example RLS rule that handles empty values
CASE 
  WHEN '${tag:store_id}' = '' THEN TRUE
  ELSE store_id_column IN (SPLIT('${tag:store_id}', ','))
END
```

### 2. Dashboard Parameters (URL Parameter)
Configure in dashboard:
1. Create parameter: `userRole` (String)
2. Use in filters: `role_column = ${userRole}`
3. Apply to visuals

## Governance Rules Database

### Table Structure
```sql
CREATE TABLE governance_rules (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  dimension VARCHAR(100) NOT NULL,  -- e.g., 'store_id', 'region', 'department'
  values TEXT[] NOT NULL,           -- e.g., ['S001', 'S002']
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Data
```sql
-- User has access to specific stores
INSERT INTO governance_rules (tenant_id, user_id, dimension, values)
VALUES ('T001', 'user-123', 'store_id', ARRAY['S001', 'S002', 'S003']);

-- User has access to specific regions
INSERT INTO governance_rules (tenant_id, user_id, dimension, values)
VALUES ('T001', 'user-123', 'region', ARRAY['North', 'South']);

-- User has access to specific departments
INSERT INTO governance_rules (tenant_id, user_id, dimension, values)
VALUES ('T001', 'user-123', 'department', ARRAY['Electronics', 'Clothing']);
```

## Benefits

### Security
- **tenant_id**: Never visible in URL, core security boundary
- **store_id & region**: Protected as session tags
- **Governance rules**: Flexible, database-driven security

### Flexibility
- **userRole**: Visible in URL for debugging
- **Dynamic governance**: Add new dimensions without code changes
- **Empty values**: Handled gracefully (empty string)

### Consistency
- **Always includes store_id and region**: Predictable RLS rules
- **Database-driven**: Governance rules from single source of truth
- **Extensible**: Easy to add new governance dimensions

## Testing

### Test with Governance Rules
1. Add governance rules to database for a user
2. Login as that user
3. Check CloudWatch logs for session tags
4. Verify data is filtered correctly

### Test without Governance Rules
1. Login as user with no governance rules
2. Check CloudWatch logs show empty store_id and region
3. Verify RLS rules handle empty values correctly

### Test Different Roles
1. Change URL parameter: `?p.userRole=Operations`
2. Verify role-based filtering works
3. Check dashboard shows role-specific views

## Troubleshooting

### Empty Session Tags Not Working
- Check RLS rules handle empty strings
- Use CASE statements to allow all data when empty
- Test with users who have no governance rules

### Governance Rules Not Applied
- Verify rules exist in database
- Check CloudWatch logs show correct tags
- Ensure RLS rules use correct tag syntax: `${tag:dimension}`

### URL Parameter Not Working
- Verify dashboard parameter exists
- Check parameter name is exactly `userRole`
- Confirm URL contains `p.userRole=...`

## Summary

The final implementation provides:
- **Security**: tenant_id, store_id, region as session tags
- **Flexibility**: userRole as URL parameter
- **Consistency**: Always includes store_id and region (even if empty)
- **Extensibility**: Database-driven governance rules
- **Simplicity**: Single code path, clear separation of concerns

This approach balances security, flexibility, and maintainability for production use.
