# QuickSight Anonymous Embedding Implementation

## Overview
The QuickSight embedding uses **anonymous embedding** with session tags for Row-Level Security (RLS). This approach is simple, secure, and requires QuickSight Capacity Pricing.

## Architecture

### Session Tags
All user context is passed as session tags:
- `tenant_id` - Tenant identifier for multi-tenancy isolation
- `userRole` - User's role (Finance, Operations, Marketing, Admin)
- Governance rules - `region`, `store_id`, etc. (from database)

### How It Works
1. User authenticates via Cognito
2. Lambda extracts tenant_id, userRole from JWT claims
3. Lambda retrieves governance rules from PostgreSQL
4. Lambda builds session tags with all context
5. Lambda calls `GenerateEmbedUrlForAnonymousUserCommand`
6. QuickSight returns embed URL with session tags embedded
7. Frontend displays dashboard in iframe
8. QuickSight applies RLS based on session tags

## Session Tags Structure

```typescript
SessionTags: [
  { Key: "tenant_id", Value: "T001" },
  { Key: "userRole", Value: "Finance" },
  { Key: "region", Value: "North,South" },      // from governance rules
  { Key: "store_id", Value: "S001,S002" }       // from governance rules
]
```

## QuickSight Configuration

### Dataset RLS
Configure Row-Level Security in your dataset:

1. Open dataset in QuickSight Console
2. Go to "Row-level security"
3. Create rules using session tag syntax:
   ```
   ${tag:tenant_id} = tenant_id_column
   ${tag:userRole} = role_column
   ${tag:region} = region_column
   ${tag:store_id} = store_id_column
   ```

### Domain Whitelisting
Add your frontend domains to QuickSight:

1. Go to QuickSight Console → Manage QuickSight
2. Navigate to "Domains and Embedding"
3. Add approved domains:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - `https://your-production-domain.com`

## Environment Configuration

### Backend (.env)
```bash
QUICKSIGHT_AWS_ACCOUNT_ID=249759897196
QUICKSIGHT_DASHBOARD_ID=bf926a0c-e4dd-48f1-9f83-9e685858cbcb
```

### IAM Permissions
The Lambda role needs:
- `quicksight:GenerateEmbedUrlForAnonymousUser`
- `quicksight:DescribeDashboard`
- `quicksight:DescribeDashboardPermissions`

## Code Implementation

### Building Session Tags
```typescript
function buildSessionTags(
  tenantId: string,
  userRole: string,
  governanceRules: GovernanceRule[],
): SessionTag[] {
  const sessionTags: SessionTag[] = [
    { Key: "tenant_id", Value: tenantId },
    { Key: "userRole", Value: userRole },
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

### Generating Embed URL
```typescript
const command = new GenerateEmbedUrlForAnonymousUserCommand({
  AwsAccountId: QUICKSIGHT_AWS_ACCOUNT_ID,
  Namespace: "default",
  SessionLifetimeInMinutes: 15,
  AuthorizedResourceArns: [
    `arn:aws:quicksight:us-east-1:${QUICKSIGHT_AWS_ACCOUNT_ID}:dashboard/${QUICKSIGHT_DASHBOARD_ID}`,
  ],
  ExperienceConfiguration: {
    Dashboard: {
      InitialDashboardId: QUICKSIGHT_DASHBOARD_ID,
    },
  },
  SessionTags: sessionTags,
});

const response = await quicksightClient.send(command);
return response.EmbedUrl;
```

## Deployment

### Build and Deploy
```bash
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

### Apply Terraform (IAM Permissions)
```bash
cd infrastructure
terraform apply -auto-approve
```

## Testing

### Check CloudWatch Logs
```
Session tags (tenant_id, userRole, governance rules):
[
  {"Key":"tenant_id","Value":"T001"},
  {"Key":"userRole","Value":"Finance"},
  {"Key":"region","Value":"North,South"}
]

Generating anonymous embed URL with session tags for RLS
Embed URL generated for user m.hariri@zeroandone.me in tenant T001
```

### Verify Embed URL
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...
```
Note: Session tags are NOT visible in the URL (they're embedded in the token)

### Test RLS
1. Login as user from Tenant A
2. Verify only Tenant A data visible
3. Login as Finance user
4. Verify Finance-specific views
5. Check CloudWatch logs for correct session tags

## Advantages

1. **Simple**: Single API call, no user management
2. **Secure**: Session tags not visible in URL
3. **Flexible**: Easy to add new governance dimensions
4. **Consistent**: Same approach for all users
5. **No User Management**: No need to create QuickSight users

## Requirements

1. **QuickSight Capacity Pricing**: Anonymous embedding requires this pricing model
2. **Dataset RLS**: Must configure RLS rules in dataset
3. **Domain Whitelisting**: Frontend domains must be approved
4. **IAM Permissions**: Lambda needs anonymous embedding permission

## Troubleshooting

### "UnsupportedPricingPlanException"
- Your QuickSight account doesn't have Capacity Pricing
- Contact AWS to upgrade your pricing plan

### Dashboard Not Loading
- Check domain is whitelisted in QuickSight Console
- Verify CloudWatch logs for errors
- Confirm dashboard ID is correct

### RLS Not Working
- Check dataset RLS configuration
- Verify session tag syntax: `${tag:tenant_id}`
- Confirm CloudWatch logs show correct tags
- Ensure column names match in RLS rules

### "refused to connect"
- Domain not whitelisted
- Add domain in QuickSight Console
- Clear browser cache and retry

## Best Practices

1. **Tenant Isolation**: Always include tenant_id in session tags
2. **Governance Rules**: Store in database for flexibility
3. **Logging**: Monitor CloudWatch logs for issues
4. **Testing**: Test with multiple tenants and roles
5. **Security**: Never expose session tags in URLs or logs (except CloudWatch)

## Summary

Anonymous embedding with session tags provides a simple, secure way to embed QuickSight dashboards with Row-Level Security. All user context is passed as session tags, which are used by QuickSight to filter data at the dataset level.

This approach requires QuickSight Capacity Pricing but eliminates the need for user management and provides consistent behavior across all users.
