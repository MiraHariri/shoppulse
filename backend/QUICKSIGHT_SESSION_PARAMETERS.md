# QuickSight Session Parameters Implementation

## Overview
Session parameters and tags allow passing user context to QuickSight dashboards for Row-Level Security (RLS) filtering.

## Implementation Approach

### Session Tags (Both Modes)
Used for tenant isolation and governance rules:
- `tenant_id`: Tenant identifier for multi-tenancy
- Governance rules: `region`, `store_id`, etc.

### Session Parameters (Registered User Only)
Used for user role:
- `userRole`: User's role (Finance, Operations, Marketing, Admin)

## Why This Split?

1. **tenant_id as Session Tag**: 
   - Core security boundary
   - Works consistently in both modes
   - Can be used in dataset RLS rules
   - Not visible in URL

2. **userRole as Session Parameter**:
   - Flexible dashboard-level filtering
   - Can be used in calculated fields
   - Visible in URL for debugging
   - Easy to test different roles

## Session Context Structure

### Anonymous Embedding
```typescript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "role", Value: "Finance" },  // userRole as tag
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]
```

### Registered User Embedding
```typescript
// Session Tags
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]

// URL Parameter
?p.userRole=Finance
```

## QuickSight Dashboard Configuration

### For Anonymous Embedding (Session Tags)
1. Open your dataset in QuickSight
2. Go to "Row-level security"
3. Create rules using session tag syntax:
   ```
   ${tag:tenant_id} = tenant_id_column
   ${tag:role} = role_column
   ${tag:region} = region_column
   ```

### For Registered User Embedding (Mixed Approach)

#### Dataset RLS (Session Tags)
1. Open your dataset in QuickSight
2. Go to "Row-level security"
3. Create rules for tenant isolation:
   ```
   ${tag:tenant_id} = tenant_id_column
   ${tag:region} = region_column
   ${tag:store_id} = store_id_column
   ```

#### Dashboard Parameters (URL Parameter)
1. Open your dashboard in QuickSight
2. Click "Parameters" in the left panel
3. Create parameter:
   - Name: `userRole`
   - Type: String
   - Default value: (optional)

4. Use parameter in calculated fields or filters:
   ```
   role_column = ${userRole}
   ```

5. Apply filters to visuals using the parameter

## Code Implementation

### Building Session Tags
```typescript
function buildSessionTags(
  tenantId: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
  ];

  // Add governance dimension tags
  for (const rule of governanceRules) {
    sessionTags.push({
      Key: rule.dimension,
      Value: rule.values.join(","),
    });
  }

  return sessionTags;
}
```

### Building Session Parameters
```typescript
function buildSessionParameters(
  userRole: string,
): SessionParameter[] {
  return [
    { Name: "userRole", Value: userRole },
  ];
}
```

### Appending to Embed URL
```typescript
const url = new URL(response.EmbedUrl);
sessionParameters.forEach(param => {
  url.searchParams.append(`p.${param.Name}`, param.Value);
});
return url.toString();
```

## Example Embed URLs

### Anonymous Embedding
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...
```
Session tags (including role) are passed in the API call, not visible in URL.

### Registered User Embedding
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...&p.userRole=Finance
```
- Session tags (tenant_id, governance rules) passed in API call
- Only userRole parameter is visible in the URL

## Testing

### Test Session Parameters
1. Deploy the Lambda function:
   ```bash
   cd backend
   npm run build
   serverless deploy function -f quicksightEmbed --force
   ```

2. Access the dashboard from the frontend

3. Check CloudWatch logs for:
   
   **Registered User Embedding:**
   ```
   Session tags (tenant_id, governance rules):
   [{"Key":"tenant_id","Value":"T001"},{"Key":"region","Value":"North,South"}]
   
   Session parameter (userRole):
   [{"Name":"userRole","Value":"Finance"}]
   ```
   
   **Anonymous Embedding:**
   ```
   Anonymous embedding with session tags (including role):
   [{"Key":"tenant_id","Value":"T001"},{"Key":"role","Value":"Finance"},{"Key":"region","Value":"North,South"}]
   ```

4. Verify the embed URL:
   - Registered: Should contain `?p.userRole=Finance`
   - Anonymous: No URL parameters

5. In QuickSight, verify filtering:
   - tenant_id filtering works (via session tag)
   - userRole filtering works (via parameter for registered, tag for anonymous)
   - Governance rules filtering works (via session tags)

## Advantages of This Approach

1. **Security**: tenant_id in session tags (not visible in URL)
2. **Flexibility**: userRole as parameter (easy to test and debug)
3. **Consistency**: tenant_id works the same in both embedding modes
4. **Compatibility**: Works with per-session pricing
5. **Governance**: Governance rules as session tags (secure)
6. **Debugging**: userRole visible in URL for troubleshooting

## Limitations

1. **URL Length**: Too many parameters can exceed URL length limits
2. **Security**: Parameters are visible in the URL (use HTTPS)
3. **Configuration**: Requires dashboard parameter setup in QuickSight
4. **No Auto-Mapping**: Unlike session tags, parameters don't automatically map to dataset columns

## Best Practices

1. **Tenant Isolation**: Always use session tags for tenant_id (security boundary)
2. **Role Flexibility**: Use parameters for userRole (easier testing)
3. **Governance Security**: Use session tags for governance rules (not visible in URL)
4. **Consistent Naming**: Use `userRole` (not `role`) to distinguish from tag
5. **Test Thoroughly**: Verify RLS works correctly with different tenants and roles

## Migration from Session Tags

If you're switching from anonymous to registered embedding:

1. Create dashboard parameters matching your session tag names
2. Update dataset filters to use parameters instead of tags:
   - Change `${tag:tenant_id}` to `${tenant_id}`
3. Test with different user roles and tenants
4. Update documentation for dashboard maintainers

## Troubleshooting

### Parameters Not Working
- Check parameter names match exactly (case-sensitive)
- Verify parameters are created in the dashboard
- Ensure filters are using the parameters
- Check CloudWatch logs for parameter values

### Data Not Filtered
- Verify parameter values are correct
- Check dataset filters are applied
- Test with a simple filter first
- Review QuickSight audit logs

### URL Too Long
- Reduce number of governance rules
- Use shorter parameter names
- Consider using session tags (anonymous mode) instead

## Summary

Session parameters provide a flexible way to pass user context to QuickSight dashboards for RLS. The URL parameter approach works with registered user embedding and per-session pricing, making it ideal for production use.

For anonymous embedding, session tags are automatically handled by QuickSight and don't require URL manipulation.
