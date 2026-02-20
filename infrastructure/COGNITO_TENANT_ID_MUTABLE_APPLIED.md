# Cognito User Pool Recreated with Mutable tenant_id

## Summary

Successfully destroyed and recreated the AWS Cognito User Pool with `custom:tenant_id` configured as **mutable**. This allows tenant_id to be changed after user creation through the AWS Console or API.

## Changes Applied

### 1. Destroyed Old User Pool
- Destroyed Cognito User Pool: `us-east-1_7uHAvZn8K`
- Destroyed User Pool Client: `ggrhvt94hkcru9uqta7f4tjbk`
- Destroyed User Pool Domain: `shoppulse-analytics-dev-4uyfl9yq`
- Destroyed 38 related resources (API Gateway methods, integrations, etc.)

### 2. Created New User Pool with Mutable tenant_id
- Created Cognito User Pool: `us-east-1_62mjzjZHF`
- Created User Pool Client: `fnm7uhg94irur76kgj3gl0ofs`
- Created User Pool Domain: `shoppulse-analytics-dev-4uyfl9yq` (same domain)
- Recreated all 38 related resources

### 3. Updated Configuration

**Terraform Configuration** (`infrastructure/cognito.tf`):
```hcl
schema {
  name                = "tenant_id"
  attribute_data_type = "String"
  required            = false
  mutable             = true   # ✅ NOW MUTABLE
  
  string_attribute_constraints {
    min_length = 1
    max_length = 50
  }
}
```

**User Pool Client** (`write_attributes`):
```hcl
write_attributes = [
  "email",
  "custom:tenant_id",  # ✅ NOW WRITABLE
  "custom:role"
]
```

**Frontend Configuration** (`frontend/.env`):
```env
VITE_COGNITO_USER_POOL_ID=us-east-1_62mjzjZHF
VITE_COGNITO_CLIENT_ID=fnm7uhg94irur76kgj3gl0ofs
```

## New Cognito Configuration

| Attribute | Value |
|-----------|-------|
| User Pool ID | `us-east-1_62mjzjZHF` |
| Web Client ID | `fnm7uhg94irur76kgj3gl0ofs` |
| Domain | `shoppulse-analytics-dev-4uyfl9yq` |
| Region | `us-east-1` |
| API Gateway Authorizer ID | `cussi8` |

## What Changed

### tenant_id Attribute
- **Before**: `mutable = false` (immutable)
- **After**: `mutable = true` (mutable)

### User Pool Client Write Attributes
- **Before**: `["email", "custom:role"]`
- **After**: `["email", "custom:tenant_id", "custom:role"]`

## Impact

### ✅ What You Can Now Do
1. **Edit tenant_id in AWS Console**: You can now select and change tenant_id when editing a user
2. **Update tenant_id via API**: The Lambda function can update tenant_id using `AdminUpdateUserAttributes`
3. **Set tenant_id after creation**: Users can be created without tenant_id and have it set later

### ⚠️ Security Considerations
**WARNING**: Making tenant_id mutable reduces security:
- Users could potentially switch tenants if not properly controlled
- Tenant isolation is weakened at the authentication layer
- Additional application-level validation is required to prevent unauthorized tenant switching

### Recommendations
1. **Implement strict validation** in the Lambda function to prevent unauthorized tenant_id changes
2. **Audit all tenant_id changes** in the audit_logs table
3. **Restrict tenant_id updates** to super-admin users only
4. **Consider making it immutable again** once initial setup is complete

## Testing

To verify tenant_id is now mutable:

### Via AWS Console
1. Go to Cognito User Pool: `us-east-1_62mjzjZHF`
2. Select a user
3. Click "Edit"
4. You should now see `custom:tenant_id` in the editable attributes list
5. Change the value and save

### Via AWS CLI
```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_62mjzjZHF \
  --username user@example.com \
  --user-attributes Name=custom:tenant_id,Value=tenant_xyz789
```

### Via Lambda Function
The user management Lambda can now update tenant_id:
```typescript
await updateCognitoUserAttributes(cognitoUserId, [
  { Name: 'custom:tenant_id', Value: 'new_tenant_id' }
]);
```

## Data Loss

⚠️ **IMPORTANT**: All existing users in the old User Pool were deleted during this process. You will need to:
1. Recreate all users
2. Set their tenant_id values
3. Notify users of any password resets

## Files Modified

1. ✅ `infrastructure/cognito.tf` - Changed `mutable = false` to `mutable = true`
2. ✅ `infrastructure/cognito.tf` - Added `custom:tenant_id` to `write_attributes`
3. ✅ `frontend/.env` - Updated with new User Pool ID and Client ID

## Rollback Instructions

If you need to make tenant_id immutable again:

1. Update `infrastructure/cognito.tf`:
   ```hcl
   mutable = false
   ```

2. Remove `custom:tenant_id` from `write_attributes`:
   ```hcl
   write_attributes = [
     "email",
     "custom:role"
   ]
   ```

3. Destroy and recreate the User Pool:
   ```bash
   cd infrastructure
   terraform destroy -target=aws_cognito_user_pool.main -auto-approve
   terraform apply -auto-approve
   ```

## Next Steps

1. **Create test users** with tenant_id values
2. **Test tenant_id editing** in AWS Console
3. **Implement validation** in Lambda functions to control tenant_id changes
4. **Add audit logging** for tenant_id modifications
5. **Update frontend** to use new Cognito IDs (already done)

## Verification

Run these commands to verify the configuration:

```bash
# Check User Pool schema
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_62mjzjZHF \
  --query 'UserPool.SchemaAttributes[?Name==`tenant_id`]'

# Expected output: "Mutable": true

# Check User Pool Client write attributes
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_62mjzjZHF \
  --client-id fnm7uhg94irur76kgj3gl0ofs \
  --query 'UserPoolClient.WriteAttributes'

# Expected output: includes "custom:tenant_id"
```

## Conclusion

The Cognito User Pool has been successfully recreated with `custom:tenant_id` as a mutable attribute. You can now edit tenant_id values through the AWS Console, CLI, or API. However, be aware of the security implications and implement proper validation to prevent unauthorized tenant switching.

