# Hybrid Session Approach: Tags + Parameters

## Overview
The QuickSight embedding implementation uses a hybrid approach combining session tags and URL parameters for optimal security and flexibility.

## Architecture

### Session Tags (Secure)
Used for security-critical context that should not be visible in URLs:
- `tenant_id` - Core security boundary for multi-tenancy
- Governance rules - `region`, `store_id`, etc.

### URL Parameters (Flexible)
Used for user-level context that benefits from visibility:
- `userRole` - User's role for dashboard filtering

## Why This Split?

### Security First
- **tenant_id** is the primary security boundary
- Must not be visible or modifiable in URL
- Consistent across both embedding modes
- Used in dataset-level RLS

### Flexibility for Roles
- **userRole** needs to be testable and debuggable
- Visible in URL helps troubleshooting
- Can be easily modified for testing
- Used in dashboard-level filtering

### Governance Protection
- Governance rules contain sensitive business logic
- Should not be exposed in URLs
- Maintained as session tags

## Implementation by Mode

### Anonymous Embedding
All context passed as session tags:
```javascript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "role", Value: "Finance" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]
```

**URL:** No parameters
```
https://...quicksight.../dashboards/...?code=...
```

### Registered User Embedding
Hybrid approach:
```javascript
// Session Tags (secure)
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]

// URL Parameter (flexible)
?p.userRole=Finance
```

**URL:** Only userRole visible
```
https://...quicksight.../dashboards/...?code=...&p.userRole=Finance
```

## QuickSight Configuration

### Dataset RLS (Session Tags)
Configure in dataset for tenant isolation:
```
${tag:tenant_id} = tenant_id_column
${tag:region} = region_column
${tag:store_id} = store_id_column
```

### Dashboard Parameters (URL Parameters)
Configure in dashboard for role filtering:
1. Create parameter: `userRole` (String)
2. Use in filters: `role_column = ${userRole}`

### Anonymous Mode
All in dataset RLS:
```
${tag:tenant_id} = tenant_id_column
${tag:role} = role_column
${tag:region} = region_column
```

## Code Structure

### Building Session Tags
```typescript
function buildSessionTags(
  tenantId: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
  ];
  
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

### Registered User Embedding
```typescript
// Build both tags and parameters
const sessionTags = buildSessionTags(tenantId, governanceRules);
const sessionParameters = buildSessionParameters(userRole);

// Generate URL with parameter appended
const embedUrl = await generateRegisteredUserEmbedUrl(
  email,
  tenantId,
  userRole,
  sessionTags,
  sessionParameters,
);
```

### Anonymous User Embedding
```typescript
// Add role to session tags
const anonymousSessionTags = [
  ...sessionTags,
  { Key: "role", Value: userRole },
];

// Generate URL (no parameters)
const embedUrl = await generateAnonymousEmbedUrl(anonymousSessionTags);
```

## Benefits

### Security
- tenant_id never exposed in URL
- Governance rules protected
- Multi-tenancy boundary enforced at API level

### Flexibility
- userRole visible for debugging
- Easy to test different roles
- Can modify URL parameter for testing

### Consistency
- tenant_id works identically in both modes
- Same RLS rules apply regardless of embedding mode
- Predictable behavior

### Performance
- Minimal URL parameters (only one)
- No URL length concerns
- Fast parameter parsing

### Maintainability
- Clear separation of concerns
- Easy to understand which context goes where
- Simple to extend with new governance rules

## Testing Strategy

### Test Tenant Isolation
1. Login as users from different tenants
2. Verify only tenant-specific data visible
3. Check CloudWatch logs for correct tenant_id tag

### Test Role-Based Filtering
1. Login as users with different roles
2. Verify role-specific data visible
3. Check URL contains correct `p.userRole` parameter

### Test Governance Rules
1. Configure governance rules in database
2. Verify rules applied correctly
3. Check CloudWatch logs for governance tags

### Test URL Manipulation
1. Try modifying `p.userRole` in URL
2. Verify tenant_id cannot be modified (not in URL)
3. Confirm security boundaries maintained

## Troubleshooting

### tenant_id Not Filtering
- Check dataset RLS configuration
- Verify session tag is being sent (CloudWatch logs)
- Ensure `${tag:tenant_id}` syntax is correct

### userRole Not Filtering
- Check dashboard parameter exists
- Verify parameter name is exactly `userRole`
- Confirm URL contains `p.userRole=...`
- Check filter uses `${userRole}` syntax

### Governance Rules Not Working
- Verify rules exist in database
- Check CloudWatch logs for governance tags
- Ensure dataset RLS includes governance dimensions

## Migration Guide

### From All Session Tags
If you were using session tags for everything:
1. Keep tenant_id and governance rules as tags
2. Move role to URL parameter (registered mode only)
3. Update dashboard to use `userRole` parameter
4. Test thoroughly

### From All URL Parameters
If you were using URL parameters for everything:
1. Move tenant_id to session tags
2. Move governance rules to session tags
3. Keep only userRole as parameter
4. Update dataset RLS for tenant_id
5. Test security boundaries

## Best Practices

1. **Never expose tenant_id in URL** - Always use session tags
2. **Use userRole parameter** - Makes testing and debugging easier
3. **Protect governance rules** - Keep as session tags
4. **Test security boundaries** - Verify tenant isolation works
5. **Monitor CloudWatch logs** - Check tags and parameters are correct
6. **Document parameters** - Maintain list of all parameters used
7. **Consistent naming** - Use `userRole` (not `role`) to avoid confusion

## Summary

The hybrid approach provides:
- **Security**: tenant_id and governance rules protected
- **Flexibility**: userRole visible for debugging
- **Consistency**: Works across both embedding modes
- **Simplicity**: Minimal URL parameters
- **Maintainability**: Clear separation of concerns

This is the recommended approach for production deployments.
