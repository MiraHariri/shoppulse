# QuickSight Hybrid Approach: Session Tags + URL Parameters

## Overview
The QuickSight embedding uses a **hybrid approach** combining session tags and URL parameters for optimal security and flexibility.

## Architecture

### Session Tags (Secure - Not visible in URL)
Used for security-critical context:
- `tenant_id` - Tenant identifier for multi-tenancy isolation
- Governance rules - `region`, `store_id`, etc. (from database)

### URL Parameters (Flexible - Visible for debugging)
Used for user-level context:
- `userRole` - User's role (Finance, Operations, Marketing, Admin)

## Why This Split?

### Security First
- **tenant_id** is the primary security boundary
- Must not be visible or modifiable in URL
- Used in dataset-level RLS (Row-Level Security)
- Protects multi-tenancy isolation

### Flexibility for Roles
- **userRole** needs to be testable and debuggable
- Visible in URL helps troubleshooting
- Can be easily modified for testing
- Used in dashboard-level parameters

### Governance Protection
- Governance rules contain sensitive business logic
- Should not be exposed in URLs
- Maintained as session tags

## Implementation

### Session Tags
```typescript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]
```

### URL Parameter
```
?p.userRole=Finance
```

### Complete Embed URL
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...&p.userRole=Finance
```

## QuickSight Configuration

### 1. Dataset RLS (Session Tags)
Configure in dataset for tenant isolation:

1. Open dataset in QuickSight Console
2. Go to "Row-level security"
3. Create rules:
   ```
   ${tag:tenant_id} = tenant_id_column
   ${tag:region} = region_column
   ${tag:store_id} = store_id_column
   ```

### 2. Dashboard Parameters (URL Parameters)
Configure in dashboard for role filtering:

1. Open dashboard in QuickSight Console
2. Click "Parameters" in left panel
3. Create parameter:
   - Name: `userRole`
   - Type: String
   - Default value: (optional, e.g., "Finance")

4. Use parameter in calculated fields or filters:
   ```
   role_column = ${userRole}
   ```

5. Apply filters to relevant visuals

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
  
  for (const rule of governanceRules) {
    sessionTags.push({
      Key: rule.dimension,
      Value: rule.values.join(","),
    });
  }
  
  return sessionTags;
}
```

### Generating Embed URL with Parameter
```typescript
const command = new GenerateEmbedUrlForAnonymousUserCommand({
  AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
  Namespace: "default",
  SessionLifetimeInMinutes: 15,
  AuthorizedResourceArns: [...],
  ExperienceConfiguration: {
    Dashboard: {
      InitialDashboardId: QUICKSIGHT_DASHBOARD_ID,
    },
  },
  SessionTags: sessionTags,
});

const response = await quicksightClient.send(command);

// Append userRole as URL parameter
const url = new URL(response.EmbedUrl);
url.searchParams.append("p.userRole", userRole);

return url.toString();
```

## Testing

### Check CloudWatch Logs
```
Session tags (tenant_id, governance rules):
[{"Key":"tenant_id","Value":"T001"},{"Key":"region","Value":"North,South"}]

userRole will be passed as URL parameter: Finance
Embed URL generated with userRole parameter
```

### Verify Embed URL
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...&p.userRole=Finance
```

### Test RLS
1. Login as user from Tenant A
2. Verify only Tenant A data visible (via session tag)
3. Login as Finance user
4. Verify Finance-specific views (via URL parameter)
5. Check URL contains `p.userRole=Finance`

## Advantages

### Security
- tenant_id never exposed in URL
- Governance rules protected
- Multi-tenancy boundary enforced at API level
- Session tags cannot be manipulated

### Flexibility
- userRole visible for debugging
- Easy to test different roles by changing URL
- Can modify parameter for testing
- Dashboard-level control

### Consistency
- tenant_id works identically for all users
- Same RLS rules apply regardless of role
- Predictable behavior

### Performance
- Minimal URL parameters (only one)
- No URL length concerns
- Fast parameter parsing

### Maintainability
- Clear separation of concerns
- Easy to understand which context goes where
- Simple to extend with new governance rules
- Dashboard parameters managed in QuickSight UI

## Best Practices

1. **Tenant Isolation**: Always use session tags for tenant_id (security boundary)
2. **Role Flexibility**: Use URL parameters for userRole (easier testing)
3. **Governance Security**: Use session tags for governance rules (not visible in URL)
4. **Consistent Naming**: Use `userRole` parameter name consistently
5. **Test Thoroughly**: Verify RLS works correctly with different tenants and roles
6. **Monitor Logs**: Check CloudWatch logs for correct tags and parameters
7. **Document Parameters**: Maintain list of all parameters used in dashboard

## Troubleshooting

### tenant_id Not Filtering
- Check dataset RLS configuration
- Verify session tag syntax: `${tag:tenant_id}`
- Confirm CloudWatch logs show tenant_id tag
- Ensure tenant_id column exists in dataset

### userRole Not Filtering
- Verify dashboard parameter exists
- Check parameter name is exactly `userRole`
- Confirm URL contains `p.userRole=...`
- Verify filter uses `${userRole}` syntax
- Check parameter is applied to visuals

### URL Parameter Not Working
- Ensure parameter is created in dashboard (not dataset)
- Verify parameter type is String
- Check parameter is used in filters or calculated fields
- Confirm parameter name matches exactly (case-sensitive)

### "refused to connect" Error
- Domain not whitelisted in QuickSight Console
- Add domain: Manage QuickSight → Domains and Embedding
- Clear browser cache and retry

## Requirements

1. **QuickSight Capacity Pricing**: Required for anonymous embedding
2. **Dataset RLS**: Configure for tenant_id and governance rules
3. **Dashboard Parameters**: Create userRole parameter in dashboard
4. **Domain Whitelisting**: Add frontend domains to QuickSight
5. **IAM Permissions**: Lambda needs anonymous embedding permission

## Summary

The hybrid approach provides:
- **Security**: tenant_id and governance rules protected as session tags
- **Flexibility**: userRole visible as URL parameter for debugging
- **Simplicity**: Only one URL parameter
- **Consistency**: Works for all users with same approach
- **Maintainability**: Clear separation between security and flexibility

This is the recommended approach for production deployments that need both security and flexibility.

## Deployment

### Build and Deploy
```bash
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

### Configure QuickSight
1. Dataset RLS: Add rules for `${tag:tenant_id}` and governance tags
2. Dashboard Parameters: Create `userRole` parameter
3. Domain Whitelisting: Add frontend domains
4. Test with multiple tenants and roles
