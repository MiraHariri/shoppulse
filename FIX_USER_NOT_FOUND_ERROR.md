# Fix "User not found or inactive" Error

## Problem
When trying to create a new user, you get a 403 Forbidden error with the message "User not found or inactive". This happens because the **currently logged-in user** doesn't exist in the PostgreSQL database.

## Root Cause
The Lambda function validates that the logged-in user:
1. Exists in the `users` table
2. Has `is_tenant_admin = true`
3. Has `status = 'Active'`

The user exists in Cognito but not in the database.

## Solution

### Step 1: Get Your Cognito User ID (sub)

**Option A: From Browser DevTools**
1. Log into the application
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Look for any API request
5. Check the Authorization header
6. Copy the JWT token and decode it at https://jwt.io
7. Find the `sub` claim - this is your Cognito User ID

**Option B: From AWS Console**
1. Go to AWS Cognito Console
2. Navigate to your User Pool: `us-east-1_7uHAvZn8K`
3. Click on "Users"
4. Find your user by email
5. Click on the user
6. Copy the "Sub" value

### Step 2: Connect to the Database

```bash
# Connect to PostgreSQL
psql -h shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com \
     -U shoppulse_admin \
     -d shoppulse \
     -p 5432
```

Password: `AkWoH4mTtfXOT899CtdsSjpErE02qkqQ`

### Step 3: Check Existing Data

```sql
-- Check if tenant exists
SELECT tenant_id, tenant_name, is_active FROM tenants;

-- Check existing users
SELECT user_id, tenant_id, email, cognito_user_id, role, is_tenant_admin, status 
FROM users 
ORDER BY created_at DESC;
```

### Step 4: Create Tenant (if needed)

```sql
-- Only run if no tenant exists
INSERT INTO tenants (tenant_id, tenant_name, industry, plan_tier, country, is_active)
VALUES ('T001', 'Demo Tenant', 'Retail', 'Enterprise', 'USA', true)
ON CONFLICT (tenant_id) DO NOTHING;
```

### Step 5: Add Your User to Database

```sql
-- Replace the values with your actual information
INSERT INTO users (
    user_id, 
    tenant_id, 
    email, 
    cognito_user_id, 
    role, 
    is_tenant_admin, 
    status,
    created_at
) VALUES (
    'U001',                                    -- user_id: Use U001 for first user
    'T001',                                    -- tenant_id: Must match tenant above
    'YOUR_EMAIL@example.com',                  -- email: Your login email
    'YOUR_COGNITO_SUB_FROM_STEP_1',           -- cognito_user_id: The 'sub' from Step 1
    'Admin',                                   -- role: Must be Admin to create users
    true,                                      -- is_tenant_admin: Must be true
    'Active',                                  -- status: Must be Active
    NOW()
)
ON CONFLICT (cognito_user_id) DO UPDATE SET
    is_tenant_admin = true,
    role = 'Admin',
    status = 'Active';
```

### Step 6: Verify the User

```sql
-- Check that your user was added correctly
SELECT user_id, tenant_id, email, cognito_user_id, role, is_tenant_admin, status 
FROM users 
WHERE email = 'YOUR_EMAIL@example.com';
```

### Step 7: Deploy Updated Lambda (After AWS Credentials Refresh)

```bash
# Navigate to backend directory
cd backend

# Rebuild
npm run build

# Deploy the updated function
serverless deploy function -f userManagement --force
```

## Updated Code Changes

The Lambda function has been updated to:
1. Look up users by `cognito_user_id` instead of `user_id`
2. Provide better error messages with logging
3. Help identify the exact issue when validation fails

## Testing

After completing the steps above:
1. Refresh your browser
2. Try creating a new user again
3. The error should be resolved

## Common Issues

**Issue**: "The security token included in the request is expired"
**Solution**: Refresh your AWS credentials and try deploying again

**Issue**: Still getting "User not found or inactive"
**Solution**: 
- Verify the `cognito_user_id` matches exactly (it's case-sensitive)
- Check that `is_tenant_admin = true`
- Check that `status = 'Active'`
- Check that `tenant_id` matches an existing tenant

**Issue**: "Insufficient permissions: Admin role required"
**Solution**: Make sure `is_tenant_admin = true` in the database

## Quick Reference

- **Database Host**: shoppulse-analytics-dev-db.co7o6yko2dcm.us-east-1.rds.amazonaws.com
- **Database Name**: shoppulse
- **Database User**: shoppulse_admin
- **Cognito User Pool**: us-east-1_7uHAvZn8K
- **SQL Script**: `database/add-current-user.sql`
