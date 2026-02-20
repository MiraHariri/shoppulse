# Tenant ID Immutability Fix

## Issue

The design document incorrectly stated that the `custom:tenant_id` attribute in AWS Cognito was mutable. This is incorrect - for security reasons, `custom:tenant_id` must be **immutable** to prevent users from switching tenants after creation.

## Fix Applied

Updated `.kiro/specs/shoppulse-analytics/design.md` to correctly specify:

```markdown
**Configuration**:
- Custom attribute: `custom:tenant_id` (string, required, immutable)
- Custom attribute: `custom:role` (string, required, mutable)
- Password policy: minimum 8 characters, require uppercase, lowercase, numbers
- Token expiration: Access token 1 hour, Refresh token 30 days
```

## Why Immutable?

The `custom:tenant_id` attribute must be immutable for the following security reasons:

1. **Tenant Isolation**: Prevents users from switching to a different tenant's data
2. **Data Security**: Ensures users can only access data for their assigned tenant
3. **Audit Trail**: Maintains consistent tenant association throughout user lifecycle
4. **Access Control**: Prevents privilege escalation by tenant switching

## Implementation Status

The actual infrastructure implementation is **already correct**:

✅ **Cognito Configuration** (`infrastructure/cognito.tf`):
```hcl
schema {
  name                = "tenant_id"
  attribute_data_type = "String"
  mutable             = false  # CORRECT: Immutable
  required            = true
}
```

✅ **Documentation** (`infrastructure/COGNITO_SETUP.md`):
- Correctly documents `custom:tenant_id` as immutable
- Includes security note about preventing tenant switching

✅ **Task Summary** (`infrastructure/TASK_2_SUMMARY.md`):
- Correctly states "Custom attribute `custom:tenant_id` is required and immutable"

## What Changed

**Before:**
```markdown
- Custom attribute: `custom:tenant_id` (string, required, mutable)
```

**After:**
```markdown
- Custom attribute: `custom:tenant_id` (string, required, immutable)
- Custom attribute: `custom:role` (string, required, mutable)
```

## Impact

This was a **documentation-only fix**. The actual implementation in Terraform and all related code was already correct:

- ✅ Cognito User Pool configuration: `mutable = false`
- ✅ User creation Lambda: Sets `tenant_id` on creation
- ✅ Frontend auth: Extracts `tenant_id` from JWT token
- ✅ Backend validation: Uses `tenant_id` from request context

## Verification

All references to `custom:tenant_id` across the codebase correctly treat it as immutable:

1. **Infrastructure** (`infrastructure/cognito.tf`): `mutable = false`
2. **Backend** (`backend/src/userManagement/handler.ts`): Sets `tenant_id` on user creation
3. **Frontend** (`frontend/src/store/authSlice.ts`): Reads `tenant_id` from token (read-only)
4. **Documentation**: Now correctly states immutable

## Custom Attributes Summary

| Attribute | Type | Required | Mutable | Purpose |
|-----------|------|----------|---------|---------|
| `custom:tenant_id` | String | Yes | **No** | Tenant isolation (immutable for security) |
| `custom:role` | String | Yes | **Yes** | User role (can be updated by admin) |

## Security Implications

With `custom:tenant_id` being immutable:

✅ Users cannot switch tenants after creation
✅ Tenant isolation is enforced at the authentication layer
✅ JWT tokens always contain the correct, unchangeable tenant_id
✅ No risk of cross-tenant data access through attribute manipulation

## Related Files

- `.kiro/specs/shoppulse-analytics/design.md` - **UPDATED**
- `infrastructure/cognito.tf` - Already correct
- `infrastructure/COGNITO_SETUP.md` - Already correct
- `infrastructure/TASK_2_SUMMARY.md` - Already correct
- `frontend/AMPLIFY_CONFIG_COMPLETE.md` - Already correct

## Conclusion

The design document has been corrected to accurately reflect that `custom:tenant_id` is immutable. The actual implementation was already correct - this was purely a documentation fix to ensure consistency across all specification documents.

