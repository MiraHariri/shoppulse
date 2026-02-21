# QuickSight Hybrid Session Deployment Checklist

## Pre-Deployment

- [ ] Review `HYBRID_SESSION_APPROACH.md` to understand the architecture
- [ ] Verify `.env` file has correct configuration:
  - `QUICKSIGHT_AWS_ACCOUNT_ID=249759897196`
  - `QUICKSIGHT_DASHBOARD_ID=bf926a0c-e4dd-48f1-9f83-9e685858cbcb`
  - `USE_ANONYMOUS_EMBEDDING=false` (for registered user mode)
- [ ] Ensure Terraform has been applied for IAM permissions

## Build and Deploy

```bash
cd backend
npm run build
serverless deploy function -f quicksightEmbed --force
```

- [ ] Build completed without errors
- [ ] Deployment successful
- [ ] Lambda function updated

## QuickSight Configuration

### Dataset RLS (Session Tags)
- [ ] Open dataset in QuickSight Console
- [ ] Navigate to "Row-level security"
- [ ] Create/verify RLS rules:
  ```
  ${tag:tenant_id} = tenant_id_column
  ${tag:region} = region_column (if using governance)
  ${tag:store_id} = store_id_column (if using governance)
  ```
- [ ] Save and publish dataset

### Dashboard Parameters (URL Parameters)
- [ ] Open dashboard in QuickSight Console
- [ ] Click "Parameters" in left panel
- [ ] Create parameter:
  - Name: `userRole`
  - Type: String
  - Default value: (optional, e.g., "Finance")
- [ ] Create calculated field or filter using `${userRole}`
- [ ] Apply filter to relevant visuals
- [ ] Save and publish dashboard

### Domain Whitelisting
- [ ] Go to QuickSight Console → Manage QuickSight
- [ ] Navigate to "Domains and Embedding"
- [ ] Add approved domains:
  - `http://localhost:5173`
  - `http://localhost:3000`
  - `http://127.0.0.1:5173`
  - Your production domain (if applicable)
- [ ] Save changes

## Testing

### Test Registered User Embedding
- [ ] Access frontend application
- [ ] Login as a user
- [ ] Navigate to dashboard page
- [ ] Verify dashboard loads

### Check CloudWatch Logs
- [ ] Open CloudWatch Logs for Lambda function
- [ ] Find latest execution
- [ ] Verify logs show:
  ```
  Session tags (tenant_id, governance rules):
  [{"Key":"tenant_id","Value":"T001"}...]
  
  Session parameter (userRole):
  [{"Name":"userRole","Value":"Finance"}]
  ```

### Verify Embed URL
- [ ] Check CloudWatch logs for embed URL
- [ ] Verify URL contains: `?p.userRole=Finance`
- [ ] Confirm tenant_id NOT in URL (security check)

### Test Tenant Isolation
- [ ] Login as user from Tenant A
- [ ] Verify only Tenant A data visible
- [ ] Login as user from Tenant B
- [ ] Verify only Tenant B data visible
- [ ] Check CloudWatch logs show correct tenant_id tags

### Test Role-Based Filtering
- [ ] Login as Finance user
- [ ] Verify Finance-specific data/views
- [ ] Login as Operations user
- [ ] Verify Operations-specific data/views
- [ ] Check URL parameter changes: `p.userRole=Finance` vs `p.userRole=Operations`

### Test Governance Rules (if configured)
- [ ] Login as user with region governance rule
- [ ] Verify only specified regions visible
- [ ] Check CloudWatch logs for governance tags

## Troubleshooting

### Dashboard Not Loading
- [ ] Check browser console for errors
- [ ] Verify domain is whitelisted in QuickSight
- [ ] Check CloudWatch logs for Lambda errors
- [ ] Confirm dashboard ID is correct

### tenant_id Not Filtering
- [ ] Verify dataset RLS is configured
- [ ] Check session tag syntax: `${tag:tenant_id}`
- [ ] Confirm CloudWatch logs show tenant_id tag
- [ ] Verify tenant_id column exists in dataset

### userRole Not Filtering
- [ ] Verify dashboard parameter exists
- [ ] Check parameter name is exactly `userRole`
- [ ] Confirm URL contains `p.userRole=...`
- [ ] Verify filter uses `${userRole}` syntax

### "refused to connect" Error
- [ ] Domain not whitelisted - add to QuickSight Console
- [ ] Clear browser cache and retry
- [ ] Check HTTPS vs HTTP protocol

### "Access Denied" Error
- [ ] Check IAM permissions in Terraform
- [ ] Verify Lambda role has QuickSight permissions
- [ ] Confirm user has dashboard permissions

## Post-Deployment

- [ ] Document any configuration changes
- [ ] Update team on new parameter approach
- [ ] Monitor CloudWatch logs for errors
- [ ] Test with multiple users and tenants
- [ ] Verify performance is acceptable

## Rollback Plan

If issues occur:
```bash
cd backend
git checkout <previous-commit>
npm run build
serverless deploy function -f quicksightEmbed --force
```

- [ ] Previous version code available
- [ ] Rollback procedure tested
- [ ] Team notified of rollback

## Success Criteria

- [ ] Dashboard loads for all users
- [ ] Tenant isolation working correctly
- [ ] Role-based filtering working correctly
- [ ] No errors in CloudWatch logs
- [ ] URL contains only `p.userRole` parameter
- [ ] tenant_id NOT visible in URL
- [ ] Performance is acceptable

## Notes

Date deployed: _______________
Deployed by: _______________
Issues encountered: _______________
Resolution: _______________
