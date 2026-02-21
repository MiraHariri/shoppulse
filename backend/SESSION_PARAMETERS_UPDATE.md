# Session Parameters Update Summary

## What Changed

Updated the QuickSight embed handler to use a **hybrid approach**:
- **Session Tags**: tenant_id and governance rules (secure, not visible in URL)
- **Session Parameter**: userRole only (visible in URL for debugging)

## Why This Approach?

### tenant_id as Session Tag
- Core security boundary for multi-tenancy
- Should not be visible in URL
- Works consistently in both embedding modes
- Can be used in dataset RLS rules

### userRole as Session Parameter
- Flexible dashboard-level filtering
- Visible in URL for debugging and testing
- Easy to modify for testing different roles
- Can be used in calculated fields

### Governance Rules as Session Tags
- Security-sensitive data (regions, stores, etc.)
- Should not be visible in URL
- Works with dataset RLS

## Implementation Details

### Session Tags (Both Modes)
```typescript
[
  { Key: "tenant_id", Value: "T001" },
  { Key: "region", Value: "North,South" },
  { Key: "store_id", Value: "S001,S002" }
]
```

### Session Parameter (Registered User Only)
```typescript
[
  { Name: "userRole", Value: "Finance" }
]
```

### Anonymous Embedding
Includes role in session tags:
```typescript
[
  { Key: "tenant_id", Value: "T001" },
  { Key: "role", Value: "Finance" },  // Added for anonymous mode
  { Key: "region", Value: "North,South" }
]
```

### How It Works

1. **Build Session Tags**: tenant_id + governance rules
2. **Build Session Parameter**: userRole only
3. **Generate Embed URL**: Create QuickSight embed URL
4. **Append Parameter**: Add `?p.userRole=Finance` to URL
5. **Dashboard Receives**: 
   - Session tags for tenant isolation (secure)
   - URL parameter for role-based filtering (flexible)
6. **Apply Filters**: 
   - Dataset RLS uses session tags
   - Dashboard parameters use URL parameter

### Code Changes

#### Updated Functions
```typescript
// Builds session tags (tenant_id + governance rules)
function buildSessionTags(
  tenantId: string,
  governanceRules: GovernanceRule[],
): SessionTag[]

// Builds session parameter (userRole only)
function buildSessionParameters(
  userRole: string,
): SessionParameter[]

// Updated to accept both tags and parameters
async function generateRegisteredUserEmbedUrl(
  email: string,
  tenantId: string,
  userRole: string,
  sessionTags: SessionTag[],
  sessionParameters: SessionParameter[],
): Promise<string>
```

#### URL Parameter Appending
```typescript
// Only userRole is appended to URL
const url = new URL(response.EmbedUrl);
sessionParameters.forEach(param => {
  url.searchParams.append(`p.${param.Name}`, param.Value);
});
// Result: ?p.userRole=Finance
```

## QuickSight Configuration Required

### For Registered User Embedding

1. **Dataset RLS (Session Tags)**:
   - Open dataset in QuickSight
   - Go to "Row-level security"
   - Create rules:
     ```
     ${tag:tenant_id} = tenant_id_column
     ${tag:region} = region_column
     ${tag:store_id} = store_id_column
     ```

2. **Dashboard Parameter (URL Parameter)**:
   - Open dashboard in QuickSight
   - Click "Parameters" → Add parameter
   - Name: `userRole`, Type: String
   - Use in calculated fields or filters:
     ```
     role_column = ${userRole}
     ```

### For Anonymous Embedding
Configure dataset RLS with all session tags:
```
${tag:tenant_id} = tenant_id_column
${tag:role} = role_column
${tag:region} = region_column
```

## Testing

### Check CloudWatch Logs

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

### Verify URL
**Registered:**
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...&p.userRole=Finance
```

**Anonymous:**
```
https://us-east-1.quicksight.aws.amazon.com/embed/.../dashboards/...?code=...
```
(No URL parameters - all in session tags)

### Test Dashboard
1. Access dashboard from frontend
2. Check CloudWatch logs for correct tags/parameters
3. Verify tenant_id filtering (should work via session tag)
4. Verify userRole filtering (parameter for registered, tag for anonymous)
5. Test with different tenants and roles

## Deployment

```bash
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

## Benefits

1. **Security**: tenant_id not visible in URL (session tag)
2. **Flexibility**: userRole visible for debugging (URL parameter)
3. **Consistency**: tenant_id works same way in both modes
4. **Governance**: Governance rules secure (session tags)
5. **Testing**: Easy to test different roles by changing URL
6. **Per-Session Pricing**: Works with cost-effective pricing model
7. **Hybrid Approach**: Best of both worlds (security + flexibility)

## Files Modified

- `backend/src/quicksightEmbed/handler.ts` - Added session parameters logic
- `backend/src/quicksightEmbed/types.ts` - Added SessionParameter interface
- `backend/QUICKSIGHT_SESSION_PARAMETERS.md` - Comprehensive documentation
- `backend/QUICKSIGHT_DUAL_MODE_COMPLETE.md` - Updated with parameter info

## Next Steps

1. Deploy the updated Lambda function
2. Configure dashboard parameters in QuickSight
3. Test with different users and tenants
4. Monitor CloudWatch logs for parameter values
5. Verify RLS filtering works correctly

## Documentation

See `QUICKSIGHT_SESSION_PARAMETERS.md` for detailed documentation on:
- Session parameter configuration
- QuickSight dashboard setup
- Testing procedures
- Troubleshooting guide
- Best practices
